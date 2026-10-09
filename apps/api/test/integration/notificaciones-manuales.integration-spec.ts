import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { Server } from 'node:http';
import type { PrismaService } from '../../src/prisma/prisma.service.js';
import { Escenario, levantarApp, tokenDe } from './discipulado-fixtures.js';
import { limpiarAvisos } from './notificaciones-fixtures.js';

/**
 * spec 012, T045 — los avisos manuales del backoffice contra la base real
 * (FR-026–FR-034; US4-1 a US4-8). Nunca se MANDA uno a "todas": crearía
 * avisos para las Personas de los otros archivos que corren en paralelo; el
 * alcance `todos` se prueba con el conteo, que no escribe.
 */
describe('Avisos manuales (integración)', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;
  let esc: Escenario;
  const ids: string[] = [];
  let admin: string;
  let tokenAdmin: string;
  let tokenPastor: string;
  let grupoId: string;
  let inscriptas: string[];
  let ministerioId: string;
  const http = () => request(app.getHttpServer());
  const como = (t: string) => ({ Authorization: `Bearer ${t}` });

  beforeAll(async () => {
    ({ app, prisma } = await levantarApp());
    esc = new Escenario(prisma, `man${Date.now()}`);
    await esc.preparar();
    admin = await esc.persona('admin', { rol: ['miembro_registrado', 'admin'] });
    const pastor = await esc.persona('pastor', { rol: ['miembro_registrado', 'pastor'] });
    const disc = await esc.discipulador('disc');
    inscriptas = [await esc.persona('i1'), await esc.persona('i2'), await esc.persona('i3')];
    await prisma.persona.update({ where: { id: inscriptas[2] }, data: { email: null } });
    ({ grupoId } = await esc.grupo(disc, inscriptas, admin));
    ids.push(admin, pastor, disc, ...inscriptas);
    tokenAdmin = await tokenDe(admin, ['miembro_registrado', 'admin']);
    tokenPastor = await tokenDe(pastor, ['miembro_registrado', 'pastor']);
    ministerioId = (await prisma.ministerio.create({ data: { nombre: `Ministerio integ ${Date.now()}`, descripcion: 'x' }, select: { id: true } })).id;
  });

  afterAll(async () => {
    await limpiarAvisos(prisma, ids);
    await prisma.ministerio.deleteMany({ where: { id: ministerioId } });
    await esc.limpiar();
    await app.close();
  });

  it('el conteo previo es lo mismo que después se crea (FR-028, Principio XI)', async () => {
    const conteo = await http().post('/notificaciones/destinatarios').set(como(tokenAdmin)).send({ alcance: 'grupo', alcanceId: grupoId }).expect(200);
    expect(conteo.body).toEqual({ personas: 3, conEmail: 2 });
    const todas = await http().post('/notificaciones/destinatarios').set(como(tokenAdmin)).send({ alcance: 'todos' }).expect(200);
    expect(todas.body.personas).toBeGreaterThanOrEqual(ids.length);
  });

  it('mandar uno importante a un Grupo: app para las 3 y email para las 2 que tienen (US4-1, US4-2, FR-017)', async () => {
    const r = await http()
      .post('/notificaciones')
      .set(como(tokenAdmin))
      .send({ titulo: '  Cambio de horario  ', mensaje: 'El encuentro pasa a las 20.', alcance: 'grupo', alcanceId: grupoId, importante: true })
      .expect(201);
    expect(r.body).toMatchObject({ titulo: 'Cambio de horario', alcance: 'grupo', importante: true, autor: { id: admin }, destinatarios: 3, leidas: 0 });
    const n = await prisma.notificacion.findUniqueOrThrow({ where: { id: r.body.id }, select: { tipo: true, creadoPorId: true, mensaje: true } });
    expect(n).toEqual({ tipo: 'manual', creadoPorId: admin, mensaje: 'El encuentro pasa a las 20.' });
    const entregas = await prisma.entregaNotificacion.findMany({ where: { notificacionId: r.body.id }, select: { personaId: true, canal: true } });
    expect(entregas.filter((e) => e.canal === 'app').map((e) => e.personaId).sort()).toEqual([...inscriptas].sort());
    expect(entregas.filter((e) => e.canal === 'email').map((e) => e.personaId).sort()).toEqual(inscriptas.slice(0, 2).sort());

    // US4-6, FR-030: el detalle con las estadísticas.
    await prisma.entregaNotificacion.updateMany({ where: { notificacionId: r.body.id, personaId: inscriptas[0], canal: 'app' }, data: { leidaEn: new Date() } });
    await prisma.entregaNotificacion.updateMany({ where: { notificacionId: r.body.id, personaId: inscriptas[1], canal: 'email' }, data: { estado: 'fallida', ultimoError: 'ENVIO_FALLIDO' } });
    await prisma.entregaNotificacion.updateMany({ where: { notificacionId: r.body.id, personaId: inscriptas[0], canal: 'email' }, data: { estado: 'enviada' } });
    const detalle = await http().get(`/notificaciones/${r.body.id}`).set(como(tokenPastor)).expect(200);
    expect(detalle.body).toMatchObject({ mensaje: 'El encuentro pasa a las 20.', destinatarios: 3, leidas: 1, emails: { enviados: 1, pendientes: 0, fallidos: 1, personasFallidas: [{ id: inscriptas[1] }] } });
    expect(JSON.stringify(detalle.body)).not.toContain('@example.com');

    // FR-026: aparece primera en el listado.
    const lista = await http().get('/notificaciones').set(como(tokenPastor)).expect(200);
    expect(lista.body.items[0]).toMatchObject({ id: r.body.id, destinatarios: 3, leidas: 1, alcanceNombre: expect.any(String) });
  });

  it('uno normal no crea Entregas email', async () => {
    const r = await http().post('/notificaciones').set(como(tokenAdmin)).send({ titulo: 'Normal', mensaje: 'Texto.', alcance: 'grupo', alcanceId: grupoId, importante: false }).expect(201);
    expect(await prisma.entregaNotificacion.count({ where: { notificacionId: r.body.id, canal: 'email' } })).toBe(0);
  });

  it('errores por campo con su código (US4-3, FR-027, FR-034)', async () => {
    const vacio = await http().post('/notificaciones').set(como(tokenAdmin)).send({ titulo: '   ', mensaje: '', importante: false }).expect(400);
    expect(vacio.body.code).toBe('VALIDACION');
    expect(vacio.body.errors).toEqual([
      { campo: 'titulo', code: 'TITULO_REQUERIDO' },
      { campo: 'mensaje', code: 'MENSAJE_REQUERIDO' },
      { campo: 'alcance', code: 'ALCANCE_REQUERIDO' },
    ]);
    const largos = await http()
      .post('/notificaciones')
      .set(como(tokenAdmin))
      .send({ titulo: 'x'.repeat(81), mensaje: 'y'.repeat(1001), alcance: 'grupo', importante: false })
      .expect(400);
    expect(largos.body.errors).toEqual([
      { campo: 'titulo', code: 'TITULO_DEMASIADO_LARGO' },
      { campo: 'mensaje', code: 'MENSAJE_DEMASIADO_LARGO' },
      { campo: 'alcanceId', code: 'ALCANCE_ID_REQUERIDO' },
    ]);
    // 80 y 1000 justos sí entran (con tildes y eñes).
    await http()
      .post('/notificaciones')
      .set(como(tokenAdmin))
      .send({ titulo: 'ñ'.repeat(80), mensaje: 'á'.repeat(1000), alcance: 'grupo', alcanceId: grupoId, importante: false })
      .expect(201);
  });

  it('alcance sin personas → 409 NOTIFICACION_SIN_DESTINATARIOS; no disponible → 409 ALCANCE_NO_DISPONIBLE (US4-5)', async () => {
    const sinGente = await http().post('/notificaciones').set(como(tokenAdmin)).send({ titulo: 't', mensaje: 'm', alcance: 'ministerio', alcanceId: ministerioId, importante: false }).expect(409);
    expect(sinGente.body.code).toBe('NOTIFICACION_SIN_DESTINATARIOS');
    const inexistente = await http().post('/notificaciones').set(como(tokenAdmin)).send({ titulo: 't', mensaje: 'm', alcance: 'grupo', alcanceId: 'no-existe', importante: false }).expect(409);
    expect(inexistente.body.code).toBe('ALCANCE_NO_DISPONIBLE');
    const otro = await esc.grupo(await esc.discipulador('disc2'), [await esc.persona('fin')], admin);
    await prisma.grupo.update({ where: { id: otro.grupoId }, data: { estado: 'finalizado', motivoCierre: 'completado', cerradoEn: new Date() } });
    const finalizado = await http().post('/notificaciones/destinatarios').set(como(tokenAdmin)).send({ alcance: 'grupo', alcanceId: otro.grupoId }).expect(409);
    expect(finalizado.body.code).toBe('ALCANCE_NO_DISPONIBLE');
  });

  it('opciones de alcance: Grupos en curso con gente y Ministerios activos', async () => {
    const r = await http().get('/notificaciones/opciones-alcance').set(como(tokenAdmin)).expect(200);
    expect(r.body.grupos.map((g: { id: string }) => g.id)).toContain(grupoId);
    expect(r.body.ministerios.map((m: { id: string }) => m.id)).toContain(ministerioId);
  });

  it('permisos: Pastor lee y no manda; Discipulador y Líder de curso no mandan (US4-7, US4-8, FR-032)', async () => {
    await http().get('/notificaciones').set(como(tokenPastor)).expect(200);
    await http().post('/notificaciones').set(como(tokenPastor)).send({ titulo: 't', mensaje: 'm', alcance: 'grupo', alcanceId: grupoId }).expect(403);
    await http().get('/notificaciones/opciones-alcance').set(como(tokenPastor)).expect(403);
    const disc = await tokenDe(ids[2], ['miembro_registrado', 'discipulador']);
    const lider = await tokenDe(ids[2], ['miembro_registrado', 'lider_curso']);
    for (const t of [disc, lider]) {
      await http().post('/notificaciones').set(como(t)).send({ titulo: 't', mensaje: 'm', alcance: 'grupo', alcanceId: grupoId }).expect(403);
      await http().get('/notificaciones').set(como(t)).expect(403);
    }
  });

  it('una automática no se ve como manual; no hay PATCH ni DELETE (FR-033)', async () => {
    const auto = await prisma.notificacion.create({ data: { tipo: 'automatica', prioridad: 'normal', alcance: 'persona', alcanceId: admin, evento: 'discipulado.finalizacion_confirmada', params: {} }, select: { id: true } });
    await http().get(`/notificaciones/${auto.id}`).set(como(tokenAdmin)).expect(404);
    await prisma.notificacion.delete({ where: { id: auto.id } });
    const lista = await http().get('/notificaciones').set(como(tokenAdmin)).expect(200);
    const algun = lista.body.items[0].id as string;
    expect((await http().patch(`/notificaciones/${algun}`).set(como(tokenAdmin)).send({ titulo: 'x' })).status).toBe(404);
    expect((await http().delete(`/notificaciones/${algun}`).set(como(tokenAdmin))).status).toBe(404);
  });

  it('mails que no salieron: solo automáticos fallidos de los últimos 30 días, sin el email (FR-031)', async () => {
    const persona = inscriptas[0];
    const reciente = await prisma.notificacion.create({ data: { tipo: 'automatica', prioridad: 'importante', alcance: 'persona', alcanceId: persona, evento: 'discipulado.solicitud_rechazada', params: { solicitudId: 's' } }, select: { id: true } });
    const viejo = await prisma.notificacion.create({ data: { tipo: 'automatica', prioridad: 'importante', alcance: 'persona', alcanceId: persona, evento: 'discipulado.propuesta_aceptada', params: {} }, select: { id: true } });
    const fallida = await prisma.entregaNotificacion.create({ data: { notificacionId: reciente.id, personaId: persona, canal: 'email', estado: 'fallida', ultimoError: 'SIN_EMAIL' }, select: { id: true } });
    const vieja = await prisma.entregaNotificacion.create({
      data: { notificacionId: viejo.id, personaId: persona, canal: 'email', estado: 'fallida', ultimoError: 'ENVIO_FALLIDO', createdAt: new Date(Date.now() - 31 * 86_400_000) },
      select: { id: true },
    });
    const r = await http().get('/notificaciones/mails-fallidos?pagina=1').set(como(tokenPastor)).expect(200);
    const propias = r.body.items.filter((m: { persona: { id: string } }) => m.persona.id === persona);
    expect(propias.map((m: { entregaId: string }) => m.entregaId)).toContain(fallida.id);
    expect(propias.map((m: { entregaId: string }) => m.entregaId)).not.toContain(vieja.id);
    expect(propias.find((m: { entregaId: string }) => m.entregaId === fallida.id)).toMatchObject({ evento: 'discipulado.solicitud_rechazada', motivo: 'SIN_EMAIL' });
    // Las manuales fallidas (las del test de arriba) no aparecen acá.
    expect(r.body.items.every((m: { evento: string | null }) => m.evento !== null)).toBe(true);
    expect(JSON.stringify(r.body)).not.toContain('@example.com');
  });
});
