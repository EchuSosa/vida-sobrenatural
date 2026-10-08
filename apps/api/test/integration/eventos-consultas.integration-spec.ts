import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import { instanteEnArgentina } from '@vida-sobrenatural/shared-types';
import type { PrismaService } from '../../src/prisma/prisma.service.js';
import { EventosConsultasService } from '../../src/evento/eventos-consultas.service.js';
import { EscenarioEventos, levantarApp } from './eventos-fixtures.js';

/** spec 011, T080 — FR-050: las consultas de los recordatorios para la 012. */
describe('Consultas de recordatorios de Eventos (integración)', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;
  let esc: EscenarioEventos;
  let consultas: EventosConsultasService;

  beforeAll(async () => {
    ({ app, prisma } = await levantarApp());
    esc = new EscenarioEventos(prisma, `cons${Date.now()}`);
    await esc.preparar();
    consultas = app.get(EventosConsultasService);
  });
  afterAll(async () => {
    await esc.limpiar();
    await app.close();
  });

  it('evento_proximo: solo las confirmadas, y nada si el Evento está cancelado', async () => {
    const ev = await esc.evento();
    const confirmada = await esc.persona('c');
    await esc.inscripcion(ev.id, confirmada);
    await esc.inscripcion(ev.id, await esc.persona('p'), 'pendiente');
    await esc.inscripcion(ev.id, await esc.persona('l'), 'lista_espera');
    expect(await consultas.destinatariosEventoProximo(ev.id)).toEqual([confirmada]);
    const cancelado = await esc.evento({ estado: 'cancelado' });
    await esc.inscripcion(cancelado.id, await esc.persona('cc'));
    expect(await consultas.destinatariosEventoProximo(cancelado.id)).toEqual([]);
  });

  it('recordatorio_inscripcion: el día exacto en zona AR; no bautismos, cancelados, eliminados ni con cupo completo', async () => {
    // 15 de noviembre 00:30 en Argentina, 7 días antes = 8 de noviembre.
    const inicio = instanteEnArgentina('2030-11-15', '00:30');
    const hoy = instanteEnArgentina('2030-11-08', '12:00');
    const si = await esc.evento({ inicio, diasAnticipacionRecordatorio: 7, nombre: `Recordar ${esc.sufijo}` });
    await esc.evento({ inicio, diasAnticipacionRecordatorio: 6 });
    await esc.evento({ inicio, diasAnticipacionRecordatorio: 7, estado: 'cancelado' });
    await esc.evento({ inicio, diasAnticipacionRecordatorio: 7, eliminadoEn: new Date() });
    const lleno = await esc.evento({ inicio, diasAnticipacionRecordatorio: 7, cupo: 1 });
    await esc.inscripcion(lleno.id, await esc.persona('llena'));
    const ids = (await consultas.eventosParaRecordatorioInscripcion(hoy)).map((e) => e.eventoId);
    expect(ids).toContain(si.id);
    expect(ids).not.toContain(lleno.id);
    const deEstaSede = await prisma.evento.findMany({ where: { sedeId: esc.sedeId, id: { in: ids } }, select: { id: true } });
    expect(deEstaSede.map((e) => e.id)).toEqual([si.id]);
    // El día anterior en Argentina (UTC ya es el 8) no.
    expect((await consultas.eventosParaRecordatorioInscripcion(instanteEnArgentina('2030-11-07', '23:30'))).map((e) => e.eventoId)).not.toContain(si.id);
  });
});
