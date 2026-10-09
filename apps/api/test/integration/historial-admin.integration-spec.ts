import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import type { CaminoDeLaPersona, CaminoDePersonaAdmin, DeclaracionDetalle } from '@vida-sobrenatural/shared-types';
import type { PrismaService } from '../../src/prisma/prisma.service.js';
import { NotificacionesService } from '../../src/notificaciones/notificaciones.service.js';
import { BandejaService } from '../../src/bandeja/bandeja.service.js';
import { RegistroPendientesAdmin } from '../../src/bandeja/registro-pendientes.js';
import { Escenario, MARTES_19_A_21, levantarApp, tokenDe } from './discipulado-fixtures.js';
import { limpiarCamino, registrarAvisos } from './camino-fixtures.js';

/**
 * spec 006, T036 + T038 (FR-012 a FR-015, FR-018, FR-019; Historia 2,
 * escenarios 2, 3, 7, 8 y 9): el Admin confirma, no confirma, registra y anula
 * contra la base; el Pastor solo lee y el Discipulador nada. También la fuente
 * `historial` de la bandeja y su fila en los Pendientes del Inicio.
 */
describe('Historial previo del Admin (spec 006, T036/T038)', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;
  let esc: Escenario;
  let avisos: ReturnType<typeof registrarAvisos>;
  let adminId: string;
  let pastorId: string;
  let discId: string;
  const sufijo = `hadm-${Date.now()}`;
  const ADMIN = ['miembro_registrado', 'admin'];
  const PASTOR = ['miembro_registrado', 'pastor'];
  const DISC = ['miembro_registrado', 'discipulador'];

  async function como(personaId: string, rol: string[], metodo: 'get' | 'post', ruta: string, cuerpo?: object) {
    const req = request(app.getHttpServer())[metodo](ruta).set('Authorization', `Bearer ${await tokenDe(personaId, rol)}`);
    return cuerpo ? req.send(cuerpo) : req;
  }

  async function declaracion(personaId: string, etapa: 'vida_nueva' | 'vida_de_servicio' | 'ministerio' | 'bautismo', comentario?: string) {
    return prisma.declaracionHistorial.create({ data: { personaId, etapa, comentario }, select: { id: true } });
  }

  async function caminoDe(personaId: string): Promise<CaminoDeLaPersona> {
    return (await como(personaId, ['miembro_registrado'], 'get', '/camino/me')).body;
  }

  beforeAll(async () => {
    ({ app, prisma } = await levantarApp());
    avisos = registrarAvisos(app.get(NotificacionesService));
    esc = new Escenario(prisma, sufijo);
    await esc.preparar();
    adminId = await esc.persona('admin', { rol: ADMIN });
    pastorId = await esc.persona('pastor', { rol: PASTOR });
    discId = await esc.discipulador('disc', { max: 5 });
  });

  afterAll(async () => {
    avisos.restaurar();
    await limpiarCamino(prisma, `Test${sufijo}`);
    await prisma.notificacion.deleteMany({ where: { evento: { startsWith: 'historial.' }, alcanceId: { in: (await prisma.persona.findMany({ where: { apellido: `Test${sufijo}` }, select: { id: true } })).map((p) => p.id) } } });
    await esc.limpiar();
    await app.close();
  });

  beforeEach(() => {
    avisos.emitidos.length = 0;
  });

  it('confirmar: la declaración queda confirmada, crea UNA Completitud con su origen, no toca el rol y avisa una vez a la Persona', async () => {
    const id = await esc.persona('confirma');
    const { id: decl } = await declaracion(id, 'bautismo', 'En 2015');
    const res = await como(adminId, ADMIN, 'post', `/historial/declaraciones/${decl}/confirmar`);
    expect(res.status).toBe(200);
    const detalle = res.body as DeclaracionDetalle;
    expect(detalle).toMatchObject({ estado: 'confirmada', revisadoPor: { id: adminId }, contexto: { completa: 'historial' } });

    const completitudes = await prisma.completitudManual.findMany({ where: { personaId: id } });
    expect(completitudes).toHaveLength(1);
    expect(completitudes[0]).toMatchObject({ etapa: 'bautismo', origen: 'declaracion', declaracionId: decl, registradaPorId: adminId, anuladaEn: null });
    expect((await prisma.persona.findUniqueOrThrow({ where: { id }, select: { rol: true } })).rol).toEqual(['miembro_registrado']);
    expect(avisos.emitidos).toEqual([{ nombre: 'historial.declaracion_confirmada', a: { tipo: 'persona', personaId: id }, datos: { declaracionId: decl, etapa: 'bautismo' } }]);
    expect((await caminoDe(id)).etapas.find((e) => e.etapa === 'bautismo')).toEqual({ etapa: 'bautismo', estado: 'completada', como: 'historial' });
  });

  it('confirmar una ya retirada → 409 DECLARACION_NO_PENDIENTE; dos confirmaciones a la vez → una sola gana', async () => {
    const id = await esc.persona('retirada');
    const retirada = await prisma.declaracionHistorial.create({ data: { personaId: id, etapa: 'ministerio', estado: 'retirada', retiradaEn: new Date() } });
    const res = await como(adminId, ADMIN, 'post', `/historial/declaraciones/${retirada.id}/confirmar`);
    expect([res.status, res.body.code]).toEqual([409, 'DECLARACION_NO_PENDIENTE']);

    const otra = await esc.persona('carrera');
    const { id: decl } = await declaracion(otra, 'vida_de_servicio');
    const [a, b] = await Promise.all([
      como(adminId, ADMIN, 'post', `/historial/declaraciones/${decl}/confirmar`),
      como(adminId, ADMIN, 'post', `/historial/declaraciones/${decl}/confirmar`),
    ]);
    expect([a.status, b.status].sort((x, y) => x - y)).toEqual([200, 409]);
    expect(await prisma.completitudManual.count({ where: { personaId: otra } })).toBe(1);
  });

  it('confirmar con la etapa ya completa por el sistema → 409 ETAPA_YA_COMPLETADA', async () => {
    const id = await esc.persona('porsistema');
    const { inscripciones: [insc] } = await esc.grupo(discId, [id], adminId);
    await prisma.inscripcion.update({ where: { id: insc }, data: { estado: 'completada', cerradaEn: new Date() } });
    // Dato viejo: una declaración que quedó pendiente mientras el Grupo terminaba.
    const { id: decl } = await declaracion(id, 'vida_nueva');
    const res = await como(adminId, ADMIN, 'post', `/historial/declaraciones/${decl}/confirmar`);
    expect([res.status, res.body.code]).toEqual([409, 'ETAPA_YA_COMPLETADA']);
  });

  it('no confirmar con motivo: la Persona lo ve en Mi camino y puede volver a contarlo; motivo de 501 → VALIDACION', async () => {
    const id = await esc.persona('rechaza');
    const { id: decl } = await declaracion(id, 'vida_de_servicio');
    const largo = await como(adminId, ADMIN, 'post', `/historial/declaraciones/${decl}/rechazar`, { motivo: 'a'.repeat(501) });
    expect(largo.body).toMatchObject({ code: 'VALIDACION', errors: [{ campo: 'motivo', code: 'MOTIVO_DEMASIADO_LARGO' }] });

    const res = await como(adminId, ADMIN, 'post', `/historial/declaraciones/${decl}/rechazar`, { motivo: 'Traenos el certificado' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ estado: 'rechazada', motivoRechazo: 'Traenos el certificado' });
    expect(avisos.emitidos.map((e) => e.nombre)).toEqual(['historial.declaracion_rechazada']);
    expect((await caminoDe(id)).etapas.find((e) => e.etapa === 'vida_de_servicio')).toMatchObject({
      puedeDeclarar: true,
      declaracion: { estado: 'no_confirmada', motivo: 'Traenos el certificado' },
    });
  });

  it('el detalle trae lo que el sistema sabe de esa etapa y las declaraciones anteriores, sin notas', async () => {
    const id = await esc.persona('detalle');
    // La anterior se crea con fecha propia: si las dos caen en el mismo
    // milisegundo (pasa en el runner del CI), `createdAt < d.createdAt` la deja
    // afuera y el test falla sin que el código esté mal.
    await prisma.declaracionHistorial.create({ data: { personaId: id, etapa: 'bautismo', estado: 'rechazada', revisadoPorId: adminId, revisadaEn: new Date('2026-09-01T12:00:00Z'), createdAt: new Date('2026-08-30T12:00:00Z') } });
    const { id: decl } = await declaracion(id, 'bautismo', 'Otra vez');
    const res = await como(pastorId, PASTOR, 'get', `/historial/declaraciones/${decl}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      comentario: 'Otra vez',
      persona: { id, edad: expect.any(Number), sinAccesoALaApp: false },
      contexto: { completa: null, enCurso: false, completitudVigente: null, declaracionesAnteriores: [{ estado: 'rechazada', fecha: '2026-09-01T12:00:00.000Z' }] },
    });
    expect((await como(adminId, ADMIN, 'get', '/historial/declaraciones/00000000-0000-0000-0000-000000000000')).status).toBe(404);
  });

  it('registrar directo: sin declaración (origen admin); con una pendiente la confirma y se vincula; avisa a la Persona', async () => {
    const sola = await esc.persona('directo');
    const res = await como(adminId, ADMIN, 'post', `/personas/${sola}/completitudes`, { etapa: 'ministerio', nota: 'Sirve en alabanza desde 2010' });
    expect(res.status).toBe(201);
    expect(await prisma.completitudManual.findUniqueOrThrow({ where: { id: res.body.id } })).toMatchObject({ origen: 'admin', declaracionId: null, nota: 'Sirve en alabanza desde 2010' });
    expect(avisos.emitidos.map((e) => e.nombre)).toEqual(['historial.completitud_registrada']);

    avisos.emitidos.length = 0;
    const conDeclaracion = await esc.persona('directodecl');
    const { id: decl } = await declaracion(conDeclaracion, 'bautismo');
    const res2 = await como(adminId, ADMIN, 'post', `/personas/${conDeclaracion}/completitudes`, { etapa: 'bautismo' });
    expect(await prisma.completitudManual.findUniqueOrThrow({ where: { id: res2.body.id } })).toMatchObject({ origen: 'declaracion', declaracionId: decl });
    expect((await prisma.declaracionHistorial.findUniqueOrThrow({ where: { id: decl } })).estado).toBe('confirmada');
    expect(avisos.emitidos.map((e) => e.nombre)).toEqual(['historial.completitud_registrada', 'historial.declaracion_confirmada']);
  });

  it('registrar: ya vigente o completa por Grupo → ETAPA_YA_COMPLETADA; VN en curso → ETAPA_EN_CURSO; nota larga → VALIDACION; Persona inexistente → 404', async () => {
    const id = await esc.persona('registrarno');
    await como(adminId, ADMIN, 'post', `/personas/${id}/completitudes`, { etapa: 'bautismo' });
    const dos = await como(adminId, ADMIN, 'post', `/personas/${id}/completitudes`, { etapa: 'bautismo' });
    expect([dos.status, dos.body.code]).toEqual([409, 'ETAPA_YA_COMPLETADA']);

    const conPedido = await esc.persona('conpedido');
    await prisma.solicitudDiscipulado.create({ data: { personaId: conPedido, franjas: { create: [MARTES_19_A_21] } } });
    const enCurso = await como(adminId, ADMIN, 'post', `/personas/${conPedido}/completitudes`, { etapa: 'vida_nueva' });
    expect([enCurso.status, enCurso.body.code]).toEqual([409, 'ETAPA_EN_CURSO']);

    const terminada = await esc.persona('terminada');
    const { inscripciones: [insc] } = await esc.grupo(discId, [terminada], adminId);
    await prisma.inscripcion.update({ where: { id: insc }, data: { estado: 'completada', cerradaEn: new Date() } });
    const yaHecha = await como(adminId, ADMIN, 'post', `/personas/${terminada}/completitudes`, { etapa: 'vida_nueva' });
    expect([yaHecha.status, yaHecha.body.code]).toEqual([409, 'ETAPA_YA_COMPLETADA']);

    const nota = await como(adminId, ADMIN, 'post', `/personas/${id}/completitudes`, { etapa: 'ministerio', nota: 'a'.repeat(501) });
    expect(nota.body).toMatchObject({ code: 'VALIDACION', errors: [{ campo: 'nota', code: 'NOTA_DEMASIADO_LARGA' }] });
    expect((await como(adminId, ADMIN, 'post', '/personas/00000000-0000-0000-0000-000000000000/completitudes', { etapa: 'bautismo' })).status).toBe(404);
  });

  it('anular: la de Vida Nueva vuelve a ofrecer el pedido; anular dos veces → COMPLETITUD_NO_VIGENTE; se puede volver a registrar', async () => {
    const id = await esc.persona('anula');
    const { body } = await como(adminId, ADMIN, 'post', `/personas/${id}/completitudes`, { etapa: 'vida_nueva' });
    expect((await caminoDe(id)).etapas[0]).toMatchObject({ estado: 'completada', como: 'historial' });

    const anular = await como(adminId, ADMIN, 'post', `/personas/${id}/completitudes/${body.id}/anular`);
    expect(anular.status).toBe(200);
    expect(await prisma.completitudManual.findUniqueOrThrow({ where: { id: body.id } })).toMatchObject({ anuladaPorId: adminId });
    const camino = await caminoDe(id);
    expect(camino.etapas[0]).toEqual({ etapa: 'vida_nueva', estado: 'disponible', puedeDeclarar: true });
    expect(camino.vidaNueva.estado).toBe('puede_pedir');

    const otraVez = await como(adminId, ADMIN, 'post', `/personas/${id}/completitudes/${body.id}/anular`);
    expect([otraVez.status, otraVez.body.code]).toEqual([409, 'COMPLETITUD_NO_VIGENTE']);
    expect((await como(adminId, ADMIN, 'post', `/personas/${id}/completitudes`, { etapa: 'vida_nueva' })).status).toBe(201);
  });

  it('GET /personas/:id/camino: las cuatro etapas con lo registrado y la declaración pendiente', async () => {
    const id = await esc.persona('panel');
    await como(adminId, ADMIN, 'post', `/personas/${id}/completitudes`, { etapa: 'ministerio', nota: 'Nota' });
    const { id: decl } = await declaracion(id, 'bautismo');
    const res = await como(pastorId, PASTOR, 'get', `/personas/${id}/camino`);
    expect(res.status).toBe(200);
    const camino = res.body as CaminoDePersonaAdmin;
    expect(camino.etapas.map((e) => e.etapa)).toEqual(['vida_nueva', 'vida_de_servicio', 'ministerio', 'bautismo']);
    expect(camino.etapas[2]).toMatchObject({ completa: 'historial', completitudVigente: { origen: 'admin', nota: 'Nota', registradaPor: { id: adminId } } });
    expect(camino.etapas[3]).toMatchObject({ completa: null, declaracionPendiente: { id: decl } });
  });

  it('el Pastor lee pero no escribe (403); el Discipulador no lee ni escribe', async () => {
    const id = await esc.persona('permisos');
    const { id: decl } = await declaracion(id, 'bautismo');
    const escrituras: Array<[string, object | undefined]> = [
      [`/historial/declaraciones/${decl}/confirmar`, undefined],
      [`/historial/declaraciones/${decl}/rechazar`, {}],
      [`/personas/${id}/completitudes`, { etapa: 'ministerio' }],
      [`/personas/${id}/completitudes/x/anular`, undefined],
    ];
    for (const [ruta, cuerpo] of escrituras) {
      expect({ ruta, status: (await como(pastorId, PASTOR, 'post', ruta, cuerpo)).status }).toEqual({ ruta, status: 403 });
      expect({ ruta, status: (await como(discId, DISC, 'post', ruta, cuerpo)).status }).toEqual({ ruta, status: 403 });
    }
    for (const ruta of [`/historial/declaraciones/${decl}`, `/personas/${id}/camino`]) {
      expect((await como(pastorId, PASTOR, 'get', ruta)).status).toBe(200);
      expect((await como(discId, DISC, 'get', ruta)).status).toBe(403);
    }
  });

  it('bandeja: las declaraciones salen como tipo "historial" con su etapa; el filtro y el conteo las cuentan; Pendientes del Inicio también', async () => {
    const id = await esc.persona('bandeja');
    const { id: decl } = await declaracion(id, 'vida_de_servicio');
    const bandeja = app.get(BandejaService);
    const pagina = await bandeja.listar({ roles: ['admin'], filtro: 'abiertas', tipo: 'historial', personaId: id, orden: 'fecha', dir: 'asc', skip: 0, take: 20 });
    expect(pagina.items).toEqual([
      expect.objectContaining({ tipo: 'historial', id: decl, persona: expect.objectContaining({ id }), estado: 'pendiente', abierta: true, creadoPor: null, extra: { etapa: 'vida_de_servicio' } }),
    ]);
    expect((await bandeja.conteoAbiertas(['admin'])).historial).toBeGreaterThanOrEqual(1);
    const lineas = await app.get(RegistroPendientesAdmin).lineas(new Date());
    expect(lineas.find((l) => l.clave === 'historial_declaraciones')).toMatchObject({ enlace: '/solicitudes?tipo=historial', cantidad: expect.any(Number) });
  });
});
