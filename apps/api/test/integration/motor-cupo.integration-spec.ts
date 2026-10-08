import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import type { PrismaService } from '../../src/prisma/prisma.service.js';
import { conBloqueoDeEvento, promoverDesdeLista } from '../../src/evento/motor-cupo.js';
import { AYER, EscenarioEventos, levantarApp, tokenDe } from './eventos-fixtures.js';

/** spec 011, T013 — SC-003 y FR-016 (cupo bajo concurrencia), FR-018/SC-004 (promoción), FR-017 (posición). */
describe('Motor de cupo (integración)', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;
  let esc: EscenarioEventos;
  const nada = async () => undefined;

  beforeAll(async () => {
    ({ app, prisma } = await levantarApp());
    // Un solo servidor escuchando: 20 pedidos a la vez contra uno efímero por pedido cortan conexiones (ECONNRESET).
    await app.listen(0);
    esc = new EscenarioEventos(prisma, `cupo${Date.now()}`);
    await esc.preparar();
  });
  afterAll(async () => {
    await esc.limpiar();
    await app.close();
  });

  it('20 inscripciones simultáneas con cupo 10: exactamente 10 ocupan y el resto queda en la lista por orden de llegada (SC-003)', async () => {
    const ev = await esc.evento({ cupo: 10, permiteListaEspera: true });
    const tokens = await Promise.all(
      Array.from({ length: 20 }, async (_, i) => tokenDe(await esc.persona(`conc${i}`), ['miembro_registrado'])),
    );
    const respuestas = await Promise.all(tokens.map((t) => request(app.getHttpServer()).post(`/eventos/${ev.id}/inscripciones/me`).set('Authorization', `Bearer ${t}`)));
    expect(respuestas.every((r) => r.status === 201)).toBe(true);
    const estados = await prisma.inscripcionEvento.groupBy({ by: ['estado'], where: { eventoId: ev.id }, _count: { _all: true } });
    const cuenta = Object.fromEntries(estados.map((e) => [e.estado, e._count._all]));
    expect(cuenta).toEqual({ confirmada: 10, lista_espera: 10 });
    const posiciones = respuestas.filter((r) => r.body.estado === 'lista_espera').map((r) => r.body.posicionEnLista).sort((a, b) => a - b);
    expect(posiciones).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('no promueve si el Evento está cancelado o ya empezó (FR-018)', async () => {
    for (const datos of [{ estado: 'cancelado' as const }, { inicio: AYER() }]) {
      const ev = await esc.evento({ cupo: 2, permiteListaEspera: true, ...datos });
      await esc.inscripcion(ev.id, await esc.persona(`np${Math.random()}`));
      await esc.inscripcion(ev.id, await esc.persona(`np${Math.random()}`), 'lista_espera');
      const promovidas = await conBloqueoDeEvento(prisma, ev.id, (tx) => promoverDesdeLista(tx, ev.id, nada));
      expect(promovidas).toEqual([]);
    }
  });

  it('con lugar, promueve en orden de llegada hasta llenar (SC-004)', async () => {
    const ev = await esc.evento({ cupo: 3, permiteListaEspera: true });
    await esc.inscripcion(ev.id, await esc.persona('o1'));
    const t0 = Date.now();
    const a = await esc.inscripcion(ev.id, await esc.persona('w1'), 'lista_espera', new Date(t0));
    const b = await esc.inscripcion(ev.id, await esc.persona('w2'), 'lista_espera', new Date(t0 + 1));
    await esc.inscripcion(ev.id, await esc.persona('w3'), 'lista_espera', new Date(t0 + 2));
    const promovidas = await conBloqueoDeEvento(prisma, ev.id, (tx) => promoverDesdeLista(tx, ev.id, nada));
    expect(promovidas).toEqual([a, b]);
  });
});
