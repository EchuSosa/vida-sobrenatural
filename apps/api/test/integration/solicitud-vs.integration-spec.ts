import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import type { EstadoMiVidaDeServicio } from '@vida-sobrenatural/shared-types';
import type { PrismaService } from '../../src/prisma/prisma.service.js';
import { NotificacionesService } from '../../src/notificaciones/notificaciones.service.js';
import { estadoPrerrequisito } from '../../src/vida-de-servicio/prerrequisito.js';
import { levantarApp, tokenDe } from './discipulado-fixtures.js';
import { nacidoHace, registrarAvisos } from './camino-fixtures.js';
import { EscenarioVS } from './vida-de-servicio-fixtures.js';

/**
 * spec 008, T012 + T026 (FR-008 a FR-013; Historia 2, escenarios 1 a 8): el
 * prerrequisito por sus dos caminos y sus tres motivos de "no cumple", pedir
 * (la Persona y el Admin en su nombre), retirar y las carreras.
 */
describe('Vida de Servicio — pedir la inscripción (spec 008, T012/T026)', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;
  let vs: EscenarioVS;
  let avisos: ReturnType<typeof registrarAvisos>;
  let adminId: string;
  let discId: string;
  const ADMIN = ['miembro_registrado', 'admin'];
  const DISC = ['miembro_registrado', 'discipulador'];
  const MIEMBRO = ['miembro_registrado'];

  async function como(personaId: string, rol: string[], metodo: 'get' | 'post' | 'delete', ruta: string, cuerpo?: object) {
    const req = request(app.getHttpServer())[metodo](ruta).set('Authorization', `Bearer ${await tokenDe(personaId, rol)}`);
    return cuerpo ? req.send(cuerpo) : req;
  }
  const estado = async (id: string) => (await como(id, MIEMBRO, 'get', '/vida-de-servicio/me')).body as EstadoMiVidaDeServicio;

  beforeAll(async () => {
    ({ app, prisma } = await levantarApp());
    avisos = registrarAvisos(app.get(NotificacionesService));
    vs = new EscenarioVS(prisma, `svs-${Date.now()}`);
    await vs.preparar();
    adminId = await vs.persona('admin', { rol: ADMIN });
    discId = await vs.persona('disc', { rol: DISC });
  });

  afterAll(async () => {
    avisos.restaurar();
    await vs.limpiar();
    await app.close();
  });

  beforeEach(() => {
    avisos.emitidos.length = 0;
  });

  describe('prerrequisito (FR-008, T012)', () => {
    it('cumple por Inscripción individual, por grupal y por Completitud Manual; dice por qué vía', async () => {
      const ind = await vs.apta('pre-ind', 'individual');
      const gru = await vs.apta('pre-gru', 'grupal');
      const man = await vs.persona('pre-man');
      await prisma.completitudManual.create({ data: { personaId: man, etapa: 'vida_nueva', origen: 'admin', registradaPorId: adminId } });
      expect(await estadoPrerrequisito(prisma, ind)).toMatchObject({ cumple: true, via: { via: 'inscripcion', cursoTipo: 'individual' } });
      expect(await estadoPrerrequisito(prisma, gru)).toMatchObject({ cumple: true, via: { via: 'inscripcion', cursoTipo: 'grupal' } });
      expect(await estadoPrerrequisito(prisma, man)).toMatchObject({ cumple: true, via: { via: 'completitud_manual' } });
    });

    it('no cumple: sin Vida Nueva, con Vida Nueva en curso, con "Ya lo hice" en revisión (escenario 2)', async () => {
      const sin = await vs.persona('pre-sin');
      const enCurso = await vs.persona('pre-curso');
      await prisma.solicitudDiscipulado.create({ data: { personaId: enCurso, franjas: { create: [{ diaSemana: 2, inicio: 1140, fin: 1260 }] } } });
      const revision = await vs.persona('pre-rev');
      await prisma.declaracionHistorial.create({ data: { personaId: revision, etapa: 'vida_nueva' } });
      expect(await estado(sin)).toEqual({ estado: 'no_cumple', motivo: 'sin_vida_nueva' });
      expect(await estado(enCurso)).toEqual({ estado: 'no_cumple', motivo: 'vida_nueva_en_curso' });
      expect(await estado(revision)).toEqual({ estado: 'no_cumple', motivo: 'declaracion_en_revision' });
      const res = await como(sin, MIEMBRO, 'post', '/vida-de-servicio/solicitudes/me', { grupoId: null });
      expect(res.status).toBe(422);
      expect(res.body.code).toBe('VIDA_SERVICIO_PRERREQUISITO_NO_CUMPLIDO');
      expect(await prisma.solicitudVidaServicio.count({ where: { personaId: sin } })).toBe(0);
    });
  });

  it('puede pedir: ve las ediciones abiertas (no las cerradas ni finalizadas), pide una y queda pendiente con aviso al Admin (escenarios 1, 3)', async () => {
    const lider = await vs.lider('lid-1');
    const abierta = await vs.edicion({ nombre: `Abierta ${vs.sufijo}`, lideres: [lider] });
    const cerrada = await vs.edicion({ nombre: `Cerrada ${vs.sufijo}`, lideres: [lider], abierta: false });
    const id = await vs.apta('pide');
    const antes = await estado(id);
    expect(antes.estado).toBe('puede_pedir');
    const ediciones = antes.estado === 'puede_pedir' ? antes.ediciones.map((e) => e.grupoId) : [];
    expect(ediciones).toContain(abierta);
    expect(ediciones).not.toContain(cerrada);

    const sinEdicion = await como(id, MIEMBRO, 'post', '/vida-de-servicio/solicitudes/me', { grupoId: null });
    expect(sinEdicion.status).toBe(400);
    expect(sinEdicion.body.errors).toEqual([{ campo: 'grupoId', code: 'EDICION_REQUERIDA' }]);
    const aCerrada = await como(id, MIEMBRO, 'post', '/vida-de-servicio/solicitudes/me', { grupoId: cerrada });
    expect(aCerrada.body.errors).toEqual([{ campo: 'grupoId', code: 'EDICION_NO_DISPONIBLE' }]);

    const res = await como(id, MIEMBRO, 'post', '/vida-de-servicio/solicitudes/me', { grupoId: abierta });
    expect(res.status).toBe(201);
    expect(avisos.emitidos).toEqual([{ nombre: 'vida_servicio.solicitud_creada', a: { tipo: 'admin' }, datos: { solicitudId: res.body.solicitudId } }]);
    expect(await estado(id)).toMatchObject({ estado: 'pendiente', solicitudId: res.body.solicitudId, edicion: { grupoId: abierta }, creadaEnSuNombre: false });
    await prisma.grupo.updateMany({ where: { id: { in: [abierta, cerrada] } }, data: { estado: 'finalizado', motivoCierre: 'completado' } });
  });

  it('"para la próxima edición" (escenario 4): con ediciones abiertas pide elegir; sin ninguna, queda pendiente sin edición', async () => {
    // Los demás archivos de integración abren ediciones en paralelo, así que acá no se puede asegurar
    // que no haya ninguna sin tocar las suyas: la regla en sí la cubre el unit test de
    // `errorEdicionPedida`; esto prueba el cableado de las dos ramas según lo que haya en ese momento.
    const id = await vs.apta('proxima');
    const abiertasAntes = await prisma.grupo.count({ where: { curso: { categoria: 'vida_de_servicio' }, estado: 'en_curso', inscripcionAbierta: true } });
    const res = await como(id, MIEMBRO, 'post', '/vida-de-servicio/solicitudes/me', { grupoId: null });
    if (res.status === 201) {
      expect(await estado(id)).toMatchObject({ estado: 'pendiente', edicion: null });
    } else {
      expect(abiertasAntes + (await prisma.grupo.count({ where: { curso: { categoria: 'vida_de_servicio' }, estado: 'en_curso', inscripcionAbierta: true } }))).toBeGreaterThan(0);
      expect(res.body.errors).toEqual([{ campo: 'grupoId', code: 'EDICION_REQUERIDA' }]);
    }
  });

  it('doble pedido → 409, también en paralelo (escenario 5, D60); retirar y volver a pedir (escenario 6)', async () => {
    const lider = await vs.lider('lid-2');
    const g = await vs.edicion({ lideres: [lider] });
    const id = await vs.apta('doble');
    const [a, b] = await Promise.all([
      como(id, MIEMBRO, 'post', '/vida-de-servicio/solicitudes/me', { grupoId: g }),
      como(id, MIEMBRO, 'post', '/vida-de-servicio/solicitudes/me', { grupoId: g }),
    ]);
    expect([a.status, b.status].sort((x, y) => x - y)).toEqual([201, 409]);
    expect([a.body.code, b.body.code]).toContain('SOLICITUD_VIDA_SERVICIO_YA_PENDIENTE');
    expect(await prisma.solicitudVidaServicio.count({ where: { personaId: id, estado: 'pendiente' } })).toBe(1);

    expect((await como(id, MIEMBRO, 'delete', '/vida-de-servicio/solicitudes/me')).status).toBe(204);
    expect((await como(id, MIEMBRO, 'delete', '/vida-de-servicio/solicitudes/me')).body.code).toBe('SOLICITUD_NO_PENDIENTE');
    expect((await estado(id)).estado).toBe('puede_pedir');
    expect((await como(id, MIEMBRO, 'post', '/vida-de-servicio/solicitudes/me', { grupoId: g })).status).toBe(201);
    await prisma.grupo.update({ where: { id: g }, data: { estado: 'finalizado', motivoCierre: 'completado' } });
  });

  it('con Inscripción activa o completada → 409; con una dada de baja puede volver a pedir, pero no a esa edición (escenarios 7, 8)', async () => {
    const lider = await vs.lider('lid-3');
    const g1 = await vs.edicion({ lideres: [lider] });
    const g2 = await vs.edicion({ lideres: [lider] });
    const activa = await vs.apta('activa');
    await vs.inscribir(activa, g1);
    const completada = await vs.apta('completada');
    await vs.inscribir(completada, g1, 'completada');
    const baja = await vs.apta('baja');
    await vs.inscribir(baja, g1, 'dada_de_baja');

    for (const id of [activa, completada]) {
      const res = await como(id, MIEMBRO, 'post', '/vida-de-servicio/solicitudes/me', { grupoId: g2 });
      expect(res.status).toBe(409);
      expect(res.body.code).toBe('VIDA_SERVICIO_EN_CURSO_O_COMPLETADA');
    }
    const otraVez = await como(baja, MIEMBRO, 'post', '/vida-de-servicio/solicitudes/me', { grupoId: g1 });
    expect(otraVez.body.errors).toEqual([{ campo: 'grupoId', code: 'EDICION_NO_DISPONIBLE' }]);
    expect((await como(baja, MIEMBRO, 'post', '/vida-de-servicio/solicitudes/me', { grupoId: g2 })).status).toBe(201);
    await prisma.grupo.updateMany({ where: { id: { in: [g1, g2] } }, data: { estado: 'finalizado', motivoCierre: 'completado' } });
  });

  it('menor de 12: "lo pide su tutor" y 422 si lo intenta; el Admin sí puede pedirlo en su nombre y queda quién (FR-013)', async () => {
    const lider = await vs.lider('lid-4');
    const g = await vs.edicion({ lideres: [lider] });
    const nene = await vs.apta('nene', 'individual', { fechaNacimiento: nacidoHace(11) });
    expect(await estado(nene)).toEqual({ estado: 'lo_pide_su_tutor' });
    const solo = await como(nene, MIEMBRO, 'post', '/vida-de-servicio/solicitudes/me', { grupoId: g });
    expect(solo.status).toBe(422);
    expect(solo.body.code).toBe('EDAD_INSUFICIENTE_PARA_PEDIR_SOLO');

    const perfil = await como(adminId, ADMIN, 'get', `/personas/${nene}/vida-de-servicio`);
    expect(perfil.body).toMatchObject({ puedePedirEnSuNombre: true });
    const res = await como(adminId, ADMIN, 'post', '/vida-de-servicio/solicitudes', { personaId: nene, grupoId: g });
    expect(res.status).toBe(201);
    expect(await prisma.solicitudVidaServicio.findUniqueOrThrow({ where: { id: res.body.solicitudId }, select: { creadoPorId: true } })).toEqual({ creadoPorId: adminId });
    expect(await estado(nene)).toMatchObject({ estado: 'pendiente', creadaEnSuNombre: true });
    await prisma.grupo.update({ where: { id: g }, data: { estado: 'finalizado', motivoCierre: 'completado' } });
  });

  it('en nombre de: el Discipulador no puede (403, D143); sin prerrequisito también se rechaza (SC-002)', async () => {
    const sin = await vs.persona('en-nombre-sin');
    expect((await como(discId, DISC, 'post', '/vida-de-servicio/solicitudes', { personaId: sin, grupoId: null })).status).toBe(403);
    const res = await como(adminId, ADMIN, 'post', '/vida-de-servicio/solicitudes', { personaId: sin, grupoId: null });
    expect(res.body.code).toBe('VIDA_SERVICIO_PRERREQUISITO_NO_CUMPLIDO');
    const perfil = await como(adminId, ADMIN, 'get', `/personas/${sin}/vida-de-servicio`);
    expect(perfil.body).toMatchObject({ estado: 'no_cumple', motivo: 'sin_vida_nueva', puedePedirEnSuNombre: false });
  });
});
