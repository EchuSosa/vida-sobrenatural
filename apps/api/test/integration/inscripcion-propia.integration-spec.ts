import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import type { EventoAviso } from '@vida-sobrenatural/shared-types';
import type { PrismaService } from '../../src/prisma/prisma.service.js';
import { NotificacionesService } from '../../src/notificaciones/notificaciones.service.js';
import { registrarAvisos } from './camino-fixtures.js';
import { AYER, EscenarioEventos, levantarApp, tokenDe } from './eventos-fixtures.js';

/** spec 011, T051 — FR-015 a FR-017, FR-019, FR-021, FR-046, FR-051. */
describe('Anotarse a un Evento (integración)', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;
  let esc: EscenarioEventos;
  let avisos: { emitidos: EventoAviso[]; restaurar: () => void };
  const http = () => request(app.getHttpServer());
  const como = async (clave: string, opciones?: { estado?: 'activa' | 'pendiente_tutor' }) => {
    const id = await esc.persona(clave, opciones);
    return { id, token: await tokenDe(id, ['miembro_registrado']) };
  };
  const anotar = (eventoId: string, token: string) => http().post(`/eventos/${eventoId}/inscripciones/me`).set('Authorization', `Bearer ${token}`);

  beforeAll(async () => {
    ({ app, prisma } = await levantarApp());
    esc = new EscenarioEventos(prisma, `insc${Date.now()}`);
    await esc.preparar();
    avisos = registrarAvisos(app.get(NotificacionesService));
  });
  afterAll(async () => {
    avisos.restaurar();
    await esc.limpiar();
    await app.close();
  });
  beforeEach(() => avisos.emitidos.splice(0));

  it('confirmada, pendiente con aviso al Admin, lista de espera con posición, y CUPO_LLENO (FR-015, FR-017)', async () => {
    const ev = await esc.evento({ cupo: 1, permiteListaEspera: true, costo: '500.00', instruccionesPago: 'Alias' });
    const a = await como('a');
    const r1 = await anotar(ev.id, a.token);
    expect(r1.status).toBe(201);
    expect(r1.body).toMatchObject({ estado: 'confirmada', posicionEnLista: null, estadoPago: 'sin_pago', evento: { id: ev.id, instruccionesPago: 'Alias' } });
    const b = await como('b');
    const c = await como('c');
    expect((await anotar(ev.id, b.token)).body).toMatchObject({ estado: 'lista_espera', posicionEnLista: 1 });
    expect((await anotar(ev.id, c.token)).body).toMatchObject({ estado: 'lista_espera', posicionEnLista: 2 });

    const conAprobacion = await esc.evento({ requiereAprobacion: true });
    const r = await anotar(conAprobacion.id, a.token);
    expect(r.body.estado).toBe('pendiente');
    expect(avisos.emitidos).toEqual([expect.objectContaining({ nombre: 'evento.inscripcion_pendiente', a: { tipo: 'admin' } })]);

    const lleno = await esc.evento({ cupo: 1 });
    await anotar(lleno.id, a.token);
    const sinLugar = await anotar(lleno.id, b.token);
    expect(sinLugar.status).toBe(409);
    expect(sinLugar.body.code).toBe('CUPO_LLENO');
  });

  it('ya empezó, cancelado, informativo y bautismo se rechazan con su código (FR-019, FR-046)', async () => {
    const p = await como('rech');
    expect((await anotar((await esc.evento({ inicio: AYER() })).id, p.token)).body.code).toBe('EVENTO_YA_EMPEZO');
    expect((await anotar((await esc.evento({ estado: 'cancelado' })).id, p.token)).body.code).toBe('EVENTO_CANCELADO');
    expect((await anotar((await esc.evento({ requiereInscripcion: false })).id, p.token)).body.code).toBe('EVENTO_NO_ADMITE_INSCRIPCION');
    const bautismo = await anotar((await esc.evento({ tipo: 'bautismo' })).id, p.token);
    expect(bautismo.status).toBe(403);
    expect(bautismo.body.code).toBe('EVENTO_SOLO_INSCRIBE_ADMIN');
  });

  it('una Persona que no está activa no se anota (FR-015)', async () => {
    const p = await como('tutor', { estado: 'pendiente_tutor' });
    expect((await anotar((await esc.evento()).id, p.token)).body.code).toBe('PERSONA_NO_ACTIVA');
  });

  it('dos pedidos a la vez de la misma Persona dejan una sola abierta (FR-021)', async () => {
    const ev = await esc.evento();
    const p = await como('doble');
    const [r1, r2] = await Promise.all([anotar(ev.id, p.token), anotar(ev.id, p.token)]);
    expect([r1.status, r2.status].sort((a, b) => a - b)).toEqual([201, 409]);
    expect([r1.body.code, r2.body.code]).toContain('INSCRIPCION_EVENTO_YA_ABIERTA');
    expect(await prisma.inscripcionEvento.count({ where: { eventoId: ev.id, personaId: p.id } })).toBe(1);
  });

  it('volver a anotarse después de cancelar crea una nueva, al final de la lista (FR-021)', async () => {
    const ev = await esc.evento({ cupo: 1, permiteListaEspera: true });
    await esc.inscripcion(ev.id, await esc.persona('ocupa'));
    const otra = await como('otra');
    await anotar(ev.id, otra.token);
    const p = await como('vuelve');
    const primera = await anotar(ev.id, p.token);
    await http().post(`/inscripciones-evento/${primera.body.id}/cancelar`).set('Authorization', `Bearer ${p.token}`);
    const segunda = await anotar(ev.id, p.token);
    expect(segunda.body.id).not.toBe(primera.body.id);
    expect(segunda.body).toMatchObject({ estado: 'lista_espera', posicionEnLista: 2 });
  });

  it('mi-inscripcion: la propia con lugares en vivo; nunca la de otra Persona (FR-051)', async () => {
    const ev = await esc.evento({ cupo: 3 });
    const yo = await como('yo');
    const otra = await como('ajena');
    await anotar(ev.id, otra.token);
    const sinNada = await http().get(`/eventos/${ev.id}/mi-inscripcion`).set('Authorization', `Bearer ${yo.token}`);
    expect(sinNada.body).toEqual({ inscripcion: null, lugaresDisponibles: 2, estadoInscripcion: 'abierta' });
    await anotar(ev.id, yo.token);
    const conLa = await http().get(`/eventos/${ev.id}/mi-inscripcion`).set('Authorization', `Bearer ${yo.token}`);
    expect(conLa.body).toMatchObject({ inscripcion: { estado: 'confirmada' }, lugaresDisponibles: 1 });
    expect((await http().get(`/eventos/${ev.id}/mi-inscripcion`)).status).toBe(401);
  });
});
