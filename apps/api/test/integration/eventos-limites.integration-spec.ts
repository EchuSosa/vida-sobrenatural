import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import type { PrismaService } from '../../src/prisma/prisma.service.js';
import { LIMITE_ESCRITURA_POR_MINUTO } from '../../src/evento/limite-pedidos.guard.js';
import { EscenarioEventos, levantarApp, tokenDe } from './eventos-fixtures.js';

/** spec 011, T019 — FR-051, `docs/13`: el pedido N+1 de la misma Persona en la ventana responde 429. */
describe('Límite de pedidos de Eventos (integración)', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;
  let esc: EscenarioEventos;

  beforeAll(async () => {
    ({ app, prisma } = await levantarApp());
    esc = new EscenarioEventos(prisma, `lim${Date.now()}`);
    await esc.preparar();
  });
  afterAll(async () => {
    await esc.limpiar();
    await app.close();
  });

  it('anotarse: pasado el límite por minuto responde DEMASIADOS_PEDIDOS; otra Persona no se ve afectada', async () => {
    const ev = await esc.evento();
    const token = await tokenDe(await esc.persona('insistente'), ['miembro_registrado']);
    const post = (t: string) => request(app.getHttpServer()).post(`/eventos/${ev.id}/inscripciones/me`).set('Authorization', `Bearer ${t}`);
    for (let i = 0; i < LIMITE_ESCRITURA_POR_MINUTO; i++) expect((await post(token)).status).not.toBe(429);
    const pasado = await post(token);
    expect(pasado.status).toBe(429);
    expect(pasado.body.code).toBe('DEMASIADOS_PEDIDOS');
    expect((await post(await tokenDe(await esc.persona('otra'), ['miembro_registrado']))).status).toBe(201);
  });
});
