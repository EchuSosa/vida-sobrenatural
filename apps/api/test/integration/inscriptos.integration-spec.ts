import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import type { EventoAviso } from '@vida-sobrenatural/shared-types';
import type { PrismaService } from '../../src/prisma/prisma.service.js';
import { NotificacionesService } from '../../src/notificaciones/notificaciones.service.js';
import { registrarAvisos } from './camino-fixtures.js';
import { AYER, EscenarioEventos, levantarApp, tokenDe } from './eventos-fixtures.js';

/** spec 011, T073 y T079 — FR-025 a FR-027, FR-034, FR-047, FR-048, FR-051. */
describe('Inscriptos de un Evento (integración)', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;
  let esc: EscenarioEventos;
  let admin: string;
  let adminId: string;
  let pastor: string;
  let avisos: { emitidos: EventoAviso[]; restaurar: () => void };
  const http = () => request(app.getHttpServer());
  const post = (ruta: string, body?: object) => http().post(ruta).set('Authorization', `Bearer ${admin}`).send(body ?? {});

  beforeAll(async () => {
    ({ app, prisma } = await levantarApp());
    esc = new EscenarioEventos(prisma, `insa${Date.now()}`);
    await esc.preparar();
    adminId = await esc.persona('admin', { rol: ['admin'] });
    admin = await tokenDe(adminId, ['admin']);
    pastor = await tokenDe(await esc.persona('pastor', { rol: ['pastor'] }), ['pastor']);
    avisos = registrarAvisos(app.get(NotificacionesService));
  });
  afterAll(async () => {
    avisos.restaurar();
    await esc.limpiar();
    await app.close();
  });
  beforeEach(() => avisos.emitidos.splice(0));

  it('aprobar y rechazar con sus avisos; rechazar libera y promueve (FR-026)', async () => {
    const ev = await esc.evento({ cupo: 2, permiteListaEspera: true, requiereAprobacion: true });
    const a = await esc.inscripcion(ev.id, await esc.persona('a'), 'pendiente');
    const b = await esc.inscripcion(ev.id, await esc.persona('b'), 'pendiente');
    const enLista = await esc.inscripcion(ev.id, await esc.persona('c'), 'lista_espera');
    expect((await post(`/inscripciones-evento/${a}/aprobar`)).body).toMatchObject({ estado: 'confirmada', revisadoPor: { id: adminId } });
    const r = await post(`/inscripciones-evento/${b}/rechazar`, { motivo: 'Es solo para jóvenes' });
    expect(r.body).toMatchObject({ estado: 'rechazada', motivoRechazo: 'Es solo para jóvenes' });
    expect((await prisma.inscripcionEvento.findUnique({ where: { id: enLista } }))?.estado).toBe('pendiente');
    expect(avisos.emitidos.map((x) => x.nombre)).toEqual(['evento.inscripcion_confirmada', 'evento.inscripcion_rechazada', 'evento.lista_espera_promovida']);
  });

  it('aprobar en lote con una ya resuelta → resumen con la fallida (FR-026)', async () => {
    const ev = await esc.evento({ requiereAprobacion: true });
    const ids = [
      await esc.inscripcion(ev.id, await esc.persona('l1'), 'pendiente'),
      await esc.inscripcion(ev.id, await esc.persona('l2'), 'pendiente'),
      await esc.inscripcion(ev.id, await esc.persona('l3'), 'rechazada'),
    ];
    const r = await post(`/eventos/${ev.id}/inscripciones/aprobar-lote`, { ids });
    expect(r.body).toEqual({ aprobadas: [ids[0], ids[1]], fallidas: [{ id: ids[2], code: 'INSCRIPCION_NO_PENDIENTE' }] });
  });

  it('inscribir en nombre aplica cupo, lista y aprobación y guarda quién (FR-027)', async () => {
    const ev = await esc.evento({ cupo: 1, permiteListaEspera: true });
    await esc.inscripcion(ev.id, await esc.persona('ocupa'));
    const persona = await esc.persona('sinapp');
    const r = await post(`/eventos/${ev.id}/inscripciones`, { personaId: persona });
    expect(r.status).toBe(201);
    expect(r.body).toMatchObject({ estado: 'lista_espera', posicionEnLista: 1, creadoPor: { id: adminId } });
    expect(avisos.emitidos).toEqual([expect.objectContaining({ nombre: 'evento.inscripcion_creada_por_admin', a: { tipo: 'persona', personaId: persona } })]);
    expect((await post(`/eventos/${ev.id}/inscripciones`, { personaId: persona })).body.code).toBe('INSCRIPCION_EVENTO_YA_ABIERTA');
    const noActiva = await esc.persona('tutor', { estado: 'pendiente_tutor' });
    expect((await post(`/eventos/${ev.id}/inscripciones`, { personaId: noActiva })).body.code).toBe('PERSONA_NO_ACTIVA');
  });

  it('dar de baja promueve antes del inicio; después del inicio se permite y no promueve (FR-027, Edge Cases)', async () => {
    const ev = await esc.evento({ cupo: 1, permiteListaEspera: true });
    const conf = await esc.inscripcion(ev.id, await esc.persona('d1'));
    const enLista = await esc.inscripcion(ev.id, await esc.persona('d2'), 'lista_espera');
    expect((await post(`/inscripciones-evento/${conf}/dar-de-baja`)).body).toMatchObject({ estado: 'cancelada', motivoCancelacion: 'admin' });
    expect((await prisma.inscripcionEvento.findUnique({ where: { id: enLista } }))?.estado).toBe('confirmada');

    const pasado = await esc.evento({ cupo: 1, permiteListaEspera: true, inicio: AYER() });
    const c2 = await esc.inscripcion(pasado.id, await esc.persona('d3'));
    const l2 = await esc.inscripcion(pasado.id, await esc.persona('d4'), 'lista_espera');
    expect((await post(`/inscripciones-evento/${c2}/dar-de-baja`)).status).toBe(200);
    expect((await prisma.inscripcionEvento.findUnique({ where: { id: l2 } }))?.estado).toBe('lista_espera');
  });

  it('listado: por estado, lista en orden, días sin pago y "subió desde la lista" (FR-025)', async () => {
    const ev = await esc.evento({ cupo: 5, permiteListaEspera: true, costo: '100.00', instruccionesPago: 'Alias' });
    const conf = await esc.inscripcion(ev.id, await esc.persona('s1'));
    await prisma.inscripcionEvento.update({ where: { id: conf }, data: { createdAt: new Date(Date.now() - 3 * 86_400_000), promovidaEn: new Date() } });
    const lista = await http().get(`/eventos/${ev.id}/inscripciones?estado=confirmada`).set('Authorization', `Bearer ${pastor}`);
    expect(lista.status).toBe(200);
    expect(lista.body.items[0]).toMatchObject({ id: conf, diasSinPago: 3, promovidaSinVer: true, estadoPago: 'sin_pago', persona: { tieneAcceso: true } });
    const vista = await post(`/inscripciones-evento/${conf}/promocion-vista`);
    expect(vista.body.promovidaSinVer).toBe(false);
    expect((await http().post(`/inscripciones-evento/${conf}/promocion-vista`).set('Authorization', `Bearer ${pastor}`)).status).toBe(403);
  });

  it('la bandeja lista las pendientes con tipo inscripcion_evento (FR-034)', async () => {
    const ev = await esc.evento({ requiereAprobacion: true });
    const p = await esc.inscripcion(ev.id, await esc.persona('band'), 'pendiente');
    const r = await http().get('/solicitudes?tipo=inscripcion_evento&take=100').set('Authorization', `Bearer ${admin}`);
    expect(r.body.items).toEqual(expect.arrayContaining([expect.objectContaining({ id: p, tipo: 'inscripcion_evento', abierta: true })]));
  });

  describe('bautismo (T079, FR-047, FR-048)', () => {
    it('el Admin inscribe a un bautismo → confirmada; lleno → CUPO_LLENO; aparece en la Persona y en Mis eventos', async () => {
      const ev = await esc.evento({ tipo: 'bautismo', cupo: 1 });
      const persona = await esc.persona('bau');
      expect((await post(`/eventos/${ev.id}/inscripciones`, { personaId: persona })).body.estado).toBe('confirmada');
      expect((await post(`/eventos/${ev.id}/inscripciones`, { personaId: await esc.persona('bau2') })).body.code).toBe('CUPO_LLENO');
      const dePersona = await http().get(`/personas/${persona}/inscripciones-evento`).set('Authorization', `Bearer ${pastor}`);
      expect(dePersona.body.items).toEqual([expect.objectContaining({ estado: 'confirmada', evento: expect.objectContaining({ id: ev.id, tipo: 'bautismo' }) })]);
      const mias = await http().get('/mis-inscripciones-evento').set('Authorization', `Bearer ${await tokenDe(persona, ['miembro_registrado'])}`);
      expect(mias.body.items.map((i: { evento: { id: string } }) => i.evento.id)).toContain(ev.id);
      expect((await http().get(`/personas/${persona}/inscripciones-evento`).set('Authorization', `Bearer ${await tokenDe(persona, ['miembro_registrado'])}`)).status).toBe(403);
    });
  });
});
