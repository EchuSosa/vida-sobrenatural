import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import type { SolicitudBandeja, SolicitudVidaServicioDetalle } from '@vida-sobrenatural/shared-types';
import type { PrismaService } from '../../src/prisma/prisma.service.js';
import { NotificacionesService } from '../../src/notificaciones/notificaciones.service.js';
import { levantarApp, tokenDe } from './discipulado-fixtures.js';
import { registrarAvisos } from './camino-fixtures.js';
import { EscenarioVS } from './vida-de-servicio-fixtures.js';
import { ESPERA_CANDADO_CURSOS } from './candado-cursos.js';

/**
 * spec 008, T031 (FR-014 a FR-018; Historia 3, escenarios 1 a 6; SC-002): el
 * Admin ve los pedidos en la bandeja unificada, aprueba eligiendo edición o
 * rechaza; las carreras y los casos que ya no se pueden aprobar.
 */
describe('Vida de Servicio — revisar los pedidos (spec 008, T031)', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;
  let vs: EscenarioVS;
  let avisos: ReturnType<typeof registrarAvisos>;
  let adminId: string;
  let pastorId: string;
  let lider: string;
  const ADMIN = ['miembro_registrado', 'admin'];
  const PASTOR = ['miembro_registrado', 'pastor'];
  const MIEMBRO = ['miembro_registrado'];

  async function como(personaId: string, rol: string[], metodo: 'get' | 'post', ruta: string, cuerpo?: object) {
    const req = request(app.getHttpServer())[metodo](ruta).set('Authorization', `Bearer ${await tokenDe(personaId, rol)}`);
    return cuerpo ? req.send(cuerpo) : req;
  }

  async function pedido(personaId: string, grupoId: string | null): Promise<string> {
    const s = await prisma.solicitudVidaServicio.create({ data: { personaId, grupoId }, select: { id: true } });
    return s.id;
  }

  beforeAll(async () => {
    ({ app, prisma } = await levantarApp());
    avisos = registrarAvisos(app.get(NotificacionesService));
    vs = new EscenarioVS(prisma, `avs-${Date.now()}`);
    await vs.preparar();
    adminId = await vs.persona('admin', { rol: ADMIN });
    pastorId = await vs.persona('pastor', { rol: PASTOR });
    lider = await vs.lider('lider');
  }, ESPERA_CANDADO_CURSOS);

  afterAll(async () => {
    avisos.restaurar();
    await vs.limpiar();
    await app.close();
  });

  beforeEach(() => {
    avisos.emitidos.length = 0;
  });

  it('la bandeja trae las de Vida de Servicio con su tipo y la edición pedida; el filtro por tipo las separa (escenario 1)', async () => {
    const g = await vs.edicion({ nombre: `Bandeja ${vs.sufijo}`, lideres: [lider] });
    const a = await vs.apta('bandeja');
    const id = await pedido(a, g);
    const todas = await como(adminId, ADMIN, 'get', `/solicitudes?buscar=${encodeURIComponent(`Test${vs.sufijo}`)}`);
    expect(todas.status).toBe(200);
    const fila = (todas.body.items as SolicitudBandeja[]).find((f) => f.id === id);
    expect(fila).toMatchObject({ tipo: 'vida_de_servicio', estado: 'pendiente', abierta: true, persona: { id: a }, extra: { edicion: { grupoId: g, nombre: `Bandeja ${vs.sufijo}` } } });
    const soloDisc = await como(adminId, ADMIN, 'get', `/solicitudes?tipo=discipulado&buscar=${encodeURIComponent(`Test${vs.sufijo}`)}`);
    expect((soloDisc.body.items as SolicitudBandeja[]).some((f) => f.id === id)).toBe(false);
    const soloVs = await como(adminId, ADMIN, 'get', `/solicitudes?tipo=vida_de_servicio&buscar=${encodeURIComponent(`Test${vs.sufijo}`)}`);
    expect((soloVs.body.items as SolicitudBandeja[]).map((f) => f.tipo)).toEqual(expect.arrayContaining(['vida_de_servicio']));
  });

  it('detalle: cómo cumple, la edición pedida, las ediciones en curso; el Pastor lee y no resuelve (escenario 2)', async () => {
    const g = await vs.edicion({ lideres: [lider], abierta: false });
    const a = await vs.apta('detalle', 'grupal');
    const id = await pedido(a, g);
    const res = await como(pastorId, PASTOR, 'get', `/vida-de-servicio/solicitudes/${id}`);
    expect(res.status).toBe(200);
    const d = res.body as SolicitudVidaServicioDetalle;
    expect(d).toMatchObject({ estado: 'pendiente', persona: { id: a }, prerrequisito: { via: 'inscripcion', cursoTipo: 'grupal' }, edicionPedida: { grupoId: g, inscripcionAbierta: false }, creadoPor: null });
    expect(d.edicionesEnCurso.map((e) => e.grupoId)).toContain(g);
    expect((await como(pastorId, PASTOR, 'post', `/vida-de-servicio/solicitudes/${id}/aprobar`, { grupoId: g })).status).toBe(403);
  });

  it('aprobar: crea la Inscripción activa (aunque la inscripción esté cerrada) y la Persona la ve en curso; avisa (escenario 3)', async () => {
    const g = await vs.edicion({ lideres: [lider], abierta: false });
    const a = await vs.apta('aprueba');
    const id = await pedido(a, null);
    const res = await como(adminId, ADMIN, 'post', `/vida-de-servicio/solicitudes/${id}/aprobar`, { grupoId: g });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ estado: 'aprobada', revisadoPor: { id: adminId }, inscripcion: { grupoId: g } });
    const inscripcion = await prisma.inscripcion.findFirstOrThrow({ where: { personaId: a, grupoId: g }, select: { id: true, estado: true, solicitudVidaServicioId: true, solicitudId: true } });
    expect(inscripcion).toMatchObject({ estado: 'activa', solicitudVidaServicioId: id, solicitudId: null });
    expect(avisos.emitidos).toEqual([{ nombre: 'vida_servicio.inscripcion_aprobada', a: { tipo: 'persona', personaId: a }, datos: { solicitudId: id, grupoId: g, inscripcionId: inscripcion.id } }]);
    const mia = await como(a, MIEMBRO, 'get', '/vida-de-servicio/me');
    expect(mia.body).toMatchObject({ estado: 'en_curso', inscripcionId: inscripcion.id, edicion: { grupoId: g } });
    // Resolver otra vez → SOLICITUD_NO_PENDIENTE, sin efectos (FR-018).
    const otra = await como(adminId, ADMIN, 'post', `/vida-de-servicio/solicitudes/${id}/rechazar`, {});
    expect(otra.status).toBe(409);
    expect(otra.body.code).toBe('SOLICITUD_NO_PENDIENTE');
  });

  it('aprobar con el prerrequisito perdido → 422 y nada cambia (escenario 4, SC-002)', async () => {
    const g = await vs.edicion({ lideres: [lider] });
    const a = await vs.persona('perdio');
    const completitud = await prisma.completitudManual.create({ data: { personaId: a, etapa: 'vida_nueva', origen: 'admin', registradaPorId: adminId } });
    const id = await pedido(a, g);
    await prisma.completitudManual.update({ where: { id: completitud.id }, data: { anuladaEn: new Date(), anuladaPorId: adminId } });
    const res = await como(adminId, ADMIN, 'post', `/vida-de-servicio/solicitudes/${id}/aprobar`, { grupoId: g });
    expect(res.status).toBe(422);
    expect(res.body.code).toBe('VIDA_SERVICIO_PRERREQUISITO_NO_CUMPLIDO');
    expect(await prisma.inscripcion.count({ where: { personaId: a, grupo: { curso: { categoria: 'vida_de_servicio' } } } })).toBe(0);
    expect((await prisma.solicitudVidaServicio.findUniqueOrThrow({ where: { id } })).estado).toBe('pendiente');
  });

  it('rechazar: la Persona puede volver a pedir y no ve el motivo (escenario 5)', async () => {
    const g = await vs.edicion({ lideres: [lider] });
    const a = await vs.apta('rechaza');
    const id = await pedido(a, g);
    const largo = await como(adminId, ADMIN, 'post', `/vida-de-servicio/solicitudes/${id}/rechazar`, { motivo: 'x'.repeat(501) });
    expect(largo.body.errors).toEqual([{ campo: 'motivo', code: 'MOTIVO_DEMASIADO_LARGO' }]);
    const res = await como(adminId, ADMIN, 'post', `/vida-de-servicio/solicitudes/${id}/rechazar`, { motivo: 'Este año no hay lugar' });
    expect(res.body).toMatchObject({ estado: 'rechazada', motivoRechazo: 'Este año no hay lugar' });
    expect(avisos.emitidos).toEqual([{ nombre: 'vida_servicio.inscripcion_rechazada', a: { tipo: 'persona', personaId: a }, datos: { solicitudId: id } }]);
    const mia = await como(a, MIEMBRO, 'get', '/vida-de-servicio/me');
    expect(mia.body).toMatchObject({ estado: 'puede_pedir', anterior: { tipo: 'rechazada' } });
    expect(JSON.stringify(mia.body)).not.toContain('no hay lugar');
  });

  it('dos aprobaciones simultáneas → una sola Inscripción (escenario 6, FR-018)', async () => {
    const g = await vs.edicion({ lideres: [lider] });
    const a = await vs.apta('carrera');
    const id = await pedido(a, g);
    const [r1, r2] = await Promise.all([
      como(adminId, ADMIN, 'post', `/vida-de-servicio/solicitudes/${id}/aprobar`, { grupoId: g }),
      como(adminId, ADMIN, 'post', `/vida-de-servicio/solicitudes/${id}/aprobar`, { grupoId: g }),
    ]);
    expect([r1.status, r2.status].sort((x, y) => x - y)).toEqual([200, 409]);
    expect(await prisma.inscripcion.count({ where: { personaId: a, grupoId: g } })).toBe(1);
  });

  it('aprobar en una edición donde ya estuvo → EDICION_YA_CURSADA; en otra sí; una de Vida Nueva o finalizada → EDICION_NO_DISPONIBLE', async () => {
    const g1 = await vs.edicion({ lideres: [lider] });
    const g2 = await vs.edicion({ lideres: [lider] });
    const finalizada = await vs.edicion({ lideres: [lider] });
    await prisma.grupo.update({ where: { id: finalizada }, data: { estado: 'finalizado', motivoCierre: 'completado' } });
    const a = await vs.apta('volvio');
    await vs.inscribir(a, g1, 'dada_de_baja');
    const id = await pedido(a, null);
    const vn = await prisma.inscripcion.findFirstOrThrow({ where: { personaId: a, grupo: { curso: { categoria: 'vida_nueva' } } }, select: { grupoId: true } });
    for (const [grupoId, code] of [[g1, 'EDICION_YA_CURSADA'], [finalizada, 'EDICION_NO_DISPONIBLE'], [vn.grupoId, 'EDICION_NO_DISPONIBLE']] as const) {
      const res = await como(adminId, ADMIN, 'post', `/vida-de-servicio/solicitudes/${id}/aprobar`, { grupoId });
      expect(res.body.errors).toEqual([{ campo: 'grupoId', code }]);
    }
    expect((await como(adminId, ADMIN, 'post', `/vida-de-servicio/solicitudes/${id}/aprobar`, { grupoId: g2 })).status).toBe(200);
  });

  it('SC-002: ninguna Inscripción de Vida de Servicio de este escenario sin el prerrequisito', async () => {
    const inscripciones = await prisma.inscripcion.findMany({
      where: { grupo: { sedeId: vs.sedeId, curso: { categoria: 'vida_de_servicio' } } },
      select: { personaId: true },
    });
    for (const { personaId } of inscripciones) {
      const vn = await prisma.inscripcion.count({ where: { personaId, estado: 'completada', grupo: { curso: { categoria: 'vida_nueva' } } } });
      const manual = await prisma.completitudManual.count({ where: { personaId, etapa: 'vida_nueva' } });
      expect(vn + manual).toBeGreaterThan(0);
    }
  });
});
