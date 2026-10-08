import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import { hoyEnArgentina, instanteEnArgentina, type EventoAviso } from '@vida-sobrenatural/shared-types';
import type { PrismaService } from '../../src/prisma/prisma.service.js';
import { NotificacionesService } from '../../src/notificaciones/notificaciones.service.js';
import { resolverDestinatarios } from '../../src/notificaciones/destinatarios.js';
import { RecordatoriosEventosService } from '../../src/tareas-programadas/recordatorios-eventos.service.js';
import { EscenarioEventos, levantarApp } from './eventos-fixtures.js';

/**
 * spec 012, T054 — recordatorios de Eventos con "hoy" inyectado en 2099 (solo
 * los Eventos de este archivo caen en esas fechas). `evento.proximo` se emite
 * de verdad (llega solo a confirmadas de acá). `recordatorio_inscripcion` va a
 * TODAS las Personas activas sin inscripción: escribirlo crearía avisos para
 * las Personas de los otros archivos que corren en paralelo, así que acá se
 * anota sin escribir y el "a quién" se verifica con `resolverDestinatarios`
 * (FR-035–FR-038, US5-1 a US5-5, SC-007).
 */
const HOY = '2099-06-10';
const AHORA = instanteEnArgentina(HOY, '08:00');
const el = (fecha: string, hora = '20:00') => instanteEnArgentina(fecha, hora);

describe('Recordatorios de Eventos (integración)', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;
  let esc: EscenarioEventos;
  let servicio: RecordatoriosEventosService;
  let notificaciones: NotificacionesService;
  let original: NotificacionesService['emitir'];
  const emitidos: EventoAviso[] = [];

  beforeAll(async () => {
    ({ app, prisma } = await levantarApp());
    esc = new EscenarioEventos(prisma, `rec${Date.now()}`);
    await esc.preparar();
    servicio = app.get(RecordatoriosEventosService);
    notificaciones = app.get(NotificacionesService);
    original = notificaciones.emitir.bind(notificaciones);
    notificaciones.emitir = async (tx, evento) => {
      emitidos.push(evento);
      if (evento.nombre === 'evento.recordatorio_inscripcion') return { hayEmails: false };
      return original(tx, evento);
    };
  });

  afterAll(async () => {
    notificaciones.emitir = original;
    const eventos = (await prisma.evento.findMany({ where: { sedeId: esc.sedeId }, select: { id: true } })).map((e) => e.id);
    const notifs = (await prisma.notificacion.findMany({ where: { entidadId: { in: eventos } }, select: { id: true } })).map((n) => n.id);
    await prisma.entregaNotificacion.deleteMany({ where: { notificacionId: { in: notifs } } });
    await prisma.notificacion.deleteMany({ where: { id: { in: notifs } } });
    await esc.limpiar();
    await app.close();
  });

  beforeEach(() => emitidos.splice(0));
  const de = (eventoId: string) => emitidos.filter((e) => (e.datos as { eventoId?: string }).eventoId === eventoId);

  it('mañana: un aviso normal a cada confirmada, a nadie más; correrla dos veces no duplica (US5-1, US5-3, FR-035, FR-037)', async () => {
    const ev = await esc.evento({ nombre: 'Noche de alabanza integ', inicio: el('2099-06-11'), cupo: 5, permiteListaEspera: true });
    const [c1, c2, pend, espera, canc] = [await esc.persona('c1'), await esc.persona('c2'), await esc.persona('pend'), await esc.persona('espera'), await esc.persona('canc')];
    await esc.inscripcion(ev.id, c1);
    await esc.inscripcion(ev.id, c2);
    await esc.inscripcion(ev.id, pend, 'pendiente');
    await esc.inscripcion(ev.id, espera, 'lista_espera');
    await esc.inscripcion(ev.id, canc, 'cancelada');

    await servicio.correr(HOY, AHORA);
    await servicio.correr(HOY, AHORA);

    expect(de(ev.id).map((e) => e.nombre)).toEqual(['evento.proximo', 'evento.proximo']);
    const notifs = await prisma.notificacion.findMany({ where: { evento: 'evento.proximo', entidadId: ev.id }, select: { id: true, prioridad: true } });
    expect(notifs).toEqual([{ id: expect.any(String), prioridad: 'normal' }]);
    const entregas = await prisma.entregaNotificacion.findMany({ where: { notificacionId: notifs[0].id }, select: { personaId: true, canal: true } });
    expect(entregas.map((x) => x.personaId).sort()).toEqual([c1, c2].sort());
    expect(entregas.every((x) => x.canal === 'app')).toBe(true);
  });

  it('a `diasAnticipacionRecordatorio` días: a las activas sin inscripción vigente (US5-2, FR-036)', async () => {
    const ev = await esc.evento({ nombre: 'Retiro integ', inicio: el('2099-06-13'), diasAnticipacionRecordatorio: 3 });
    const anotada = await esc.persona('anotada');
    const sinAnotar = await esc.persona('sinanotar');
    const cancelo = await esc.persona('cancelo');
    await esc.inscripcion(ev.id, anotada);
    await esc.inscripcion(ev.id, cancelo, 'cancelada');

    await servicio.correr(HOY, AHORA);
    expect(de(ev.id)).toEqual([
      { nombre: 'evento.recordatorio_inscripcion', a: { tipo: 'todas_sin_inscripcion', eventoId: ev.id }, datos: { eventoId: ev.id, evento: 'Retiro integ', slug: ev.slug, dias: 3 } },
    ]);
    const a = (await resolverDestinatarios(prisma, { tipo: 'todas_sin_inscripcion', eventoId: ev.id })).map((d) => d.id);
    expect(a).toContain(sinAnotar);
    expect(a).toContain(cancelo);
    expect(a).not.toContain(anotada);
  });

  it('con lista de espera todavía avisa; lleno sin lista, no (US5-5)', async () => {
    const conLista = await esc.evento({ inicio: el('2099-06-12'), diasAnticipacionRecordatorio: 2, cupo: 1, permiteListaEspera: true });
    const sinLista = await esc.evento({ inicio: el('2099-06-12'), diasAnticipacionRecordatorio: 2, cupo: 1, permiteListaEspera: false });
    const p = await esc.persona('llena');
    await esc.inscripcion(conLista.id, p);
    await esc.inscripcion(sinLista.id, p);
    await servicio.correr(HOY, AHORA);
    expect(de(conLista.id)).toHaveLength(1);
    expect(de(sinLista.id)).toHaveLength(0);
  });

  it('sin inscripción, sin días, otro día, cancelado, eliminado o de bautismo: nada (US5-4, US5-5)', async () => {
    const casos = await Promise.all([
      esc.evento({ inicio: el('2099-06-13'), requiereInscripcion: false }),
      esc.evento({ inicio: el('2099-06-13'), diasAnticipacionRecordatorio: null }),
      esc.evento({ inicio: el('2099-06-14'), diasAnticipacionRecordatorio: 3 }),
      esc.evento({ inicio: el('2099-06-13'), diasAnticipacionRecordatorio: 3, estado: 'cancelado', canceladoEn: new Date() }),
      esc.evento({ inicio: el('2099-06-13'), diasAnticipacionRecordatorio: 3, eliminadoEn: new Date() }),
      esc.evento({ inicio: el('2099-06-11'), estado: 'cancelado', canceladoEn: new Date() }),
      esc.evento({ inicio: el('2099-06-11'), tipo: 'bautismo' }),
    ]);
    await servicio.correr(HOY, AHORA);
    for (const c of casos) expect(de(c.id)).toEqual([]);
  });

  it('"hoy" es la fecha civil de Argentina: a las 23:30 de allá sigue siendo el mismo día', () => {
    expect(hoyEnArgentina(instanteEnArgentina('2099-06-10', '23:30'))).toBe('2099-06-10');
    expect(hoyEnArgentina(instanteEnArgentina('2099-06-11', '00:10'))).toBe('2099-06-11');
  });
});
