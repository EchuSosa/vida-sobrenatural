import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import type { EventoAviso } from '@vida-sobrenatural/shared-types';
import type { PrismaService } from '../../src/prisma/prisma.service.js';
import { NotificacionesService } from '../../src/notificaciones/notificaciones.service.js';
import { registrarAvisos } from './camino-fixtures.js';
import { AYER, EscenarioEventos, levantarApp, tokenDe } from './eventos-fixtures.js';

/** spec 011, T037 — cancelar, reactivar, eliminar y restaurar (FR-040 a FR-043). */
describe('Ciclo de vida de un Evento (integración)', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;
  let esc: EscenarioEventos;
  let admin: string;
  let avisos: { emitidos: EventoAviso[]; restaurar: () => void };
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    ({ app, prisma } = await levantarApp());
    esc = new EscenarioEventos(prisma, `ciclo${Date.now()}`);
    await esc.preparar();
    admin = await tokenDe(await esc.persona('admin', { rol: ['admin'] }), ['admin']);
    avisos = registrarAvisos(app.get(NotificacionesService));
  });
  afterAll(async () => {
    avisos.restaurar();
    await esc.limpiar();
    await app.close();
  });
  beforeEach(() => avisos.emitidos.splice(0));

  it('cancelar conserva las Inscripciones, emite evento.cancelado a los inscriptos y sale de la cartelera (FR-040)', async () => {
    const ev = await esc.evento({ cupo: 1, permiteListaEspera: true });
    const confirmada = await esc.inscripcion(ev.id, await esc.persona('c1'));
    await esc.inscripcion(ev.id, await esc.persona('c2'), 'lista_espera');

    const res = await http().post(`/eventos/${ev.id}/cancelar`).set('Authorization', `Bearer ${admin}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ estado: 'cancelado', estadoInscripcion: 'cancelado', ocupados: 1, enEspera: 1 });
    expect((await prisma.inscripcionEvento.findUnique({ where: { id: confirmada } }))?.estado).toBe('confirmada');
    expect(avisos.emitidos).toEqual([expect.objectContaining({ nombre: 'evento.cancelado', a: { tipo: 'evento_inscriptos', eventoId: ev.id } })]);

    const cartelera = await http().get('/eventos/publicos?take=100');
    expect(cartelera.body.items.map((e: { id: string }) => e.id)).not.toContain(ev.id);
    const pagina = await http().get(`/eventos/publicos/${ev.slug}`);
    expect(pagina.body.estado).toBe('cancelado');

    // Cancelado: ni editar el cupo ni volver a cancelar; y no promueve.
    expect((await http().patch(`/eventos/${ev.id}`).set('Authorization', `Bearer ${admin}`).send({ cupo: 5 })).body.code).toBe('EVENTO_CANCELADO');
    expect((await http().post(`/eventos/${ev.id}/cancelar`).set('Authorization', `Bearer ${admin}`)).body.code).toBe('EVENTO_CANCELADO');
  });

  it('cancelar uno sin inscriptos no emite nada', async () => {
    const ev = await esc.evento();
    await http().post(`/eventos/${ev.id}/cancelar`).set('Authorization', `Bearer ${admin}`);
    expect(avisos.emitidos).toEqual([]);
  });

  it('reactivar vuelve a publicarlo con sus inscripciones intactas (FR-041)', async () => {
    const ev = await esc.evento({ estado: 'cancelado', canceladoEn: new Date() });
    await esc.inscripcion(ev.id, await esc.persona('r1'));
    const res = await http().post(`/eventos/${ev.id}/reactivar`).set('Authorization', `Bearer ${admin}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ estado: 'publicado', canceladoEn: null, ocupados: 1 });
    expect((await http().post(`/eventos/${ev.id}/reactivar`).set('Authorization', `Bearer ${admin}`)).body.code).toBe('EVENTO_NO_CANCELADO');
  });

  it('reactivar uno que ya pasó → EVENTO_YA_PASO', async () => {
    const ev = await esc.evento({ estado: 'cancelado', inicio: AYER() });
    expect((await http().post(`/eventos/${ev.id}/reactivar`).set('Authorization', `Bearer ${admin}`)).body.code).toBe('EVENTO_YA_PASO');
  });

  it('eliminar con una Inscripción (aunque esté cancelada) → EVENTO_CON_INSCRIPCIONES (FR-042)', async () => {
    const ev = await esc.evento();
    await esc.inscripcion(ev.id, await esc.persona('e1'), 'cancelada');
    const res = await http().post(`/eventos/${ev.id}/eliminar`).set('Authorization', `Bearer ${admin}`);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('EVENTO_CON_INSCRIPCIONES');
  });

  it('eliminar sin inscripciones lo saca de todo (404 público y del backoffice), queda en la papelera y se restaura (FR-042, FR-043)', async () => {
    const ev = await esc.evento();
    expect((await http().post(`/eventos/${ev.id}/eliminar`).set('Authorization', `Bearer ${admin}`)).status).toBe(204);
    const enBase = await prisma.evento.findUnique({ where: { id: ev.id } });
    expect(enBase?.eliminadoEn).not.toBeNull();
    expect(enBase?.eliminadoPorId).not.toBeNull();

    expect((await http().get(`/eventos/publicos/${ev.slug}`)).status).toBe(404);
    expect((await http().get(`/eventos/${ev.id}`).set('Authorization', `Bearer ${admin}`)).status).toBe(404);
    const todos = await http().get('/eventos?filtro=todos&take=100').set('Authorization', `Bearer ${admin}`);
    expect(todos.body.items.map((e: { id: string }) => e.id)).not.toContain(ev.id);
    const papelera = await http().get('/eventos/papelera?take=100').set('Authorization', `Bearer ${admin}`);
    expect(papelera.body.items.map((e: { id: string }) => e.id)).toContain(ev.id);

    const restaurado = await http().post(`/eventos/${ev.id}/restaurar`).set('Authorization', `Bearer ${admin}`);
    expect(restaurado.status).toBe(200);
    expect((await http().get(`/eventos/publicos/${ev.slug}`)).status).toBe(200);
    expect((await http().post(`/eventos/${ev.id}/restaurar`).set('Authorization', `Bearer ${admin}`)).status).toBe(404);
  });
});
