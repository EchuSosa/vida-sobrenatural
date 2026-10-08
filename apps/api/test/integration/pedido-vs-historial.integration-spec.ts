import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import type { PrismaService } from '../../src/prisma/prisma.service.js';
import { completoEtapa } from '../../src/camino/consultas.js';
import { Escenario, MARTES_19_A_21, levantarApp, tokenDe } from './discipulado-fixtures.js';
import { limpiarCamino } from './camino-fixtures.js';

/**
 * spec 006, T037 (FR-016, FR-017; Historia 2, escenario 6; SC-004): el pedido
 * de Vida Nueva y el "Ya lo hice" de Vida Nueva no conviven — ni en el caso
 * común ni en una carrera — y después de confirmar, `completoEtapa` responde
 * "por historial".
 */
describe('Pedido de Vida Nueva vs historial previo (spec 006, T037)', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;
  let esc: Escenario;
  let adminId: string;
  let discId: string;
  const sufijo = `pvh-${Date.now()}`;

  async function pedirPropio(personaId: string) {
    return request(app.getHttpServer())
      .post('/discipulado/solicitudes/me')
      .set('Authorization', `Bearer ${await tokenDe(personaId, ['miembro_registrado'])}`)
      .send({ franjas: [MARTES_19_A_21] });
  }

  async function pedirEnNombre(autorId: string, rol: string[], personaId: string) {
    return request(app.getHttpServer())
      .post('/discipulado/solicitudes')
      .set('Authorization', `Bearer ${await tokenDe(autorId, rol)}`)
      .send({ personaId, franjas: [MARTES_19_A_21] });
  }

  async function declararVn(personaId: string) {
    return request(app.getHttpServer())
      .post('/camino/me/declaraciones')
      .set('Authorization', `Bearer ${await tokenDe(personaId, ['miembro_registrado'])}`)
      .send({ etapa: 'vida_nueva' });
  }

  beforeAll(async () => {
    ({ app, prisma } = await levantarApp());
    esc = new Escenario(prisma, sufijo);
    await esc.preparar();
    adminId = await esc.persona('admin', { rol: ['miembro_registrado', 'admin'] });
    discId = await esc.persona('disc', { rol: ['miembro_registrado', 'discipulador'] });
  });

  afterAll(async () => {
    await limpiarCamino(prisma, `Test${sufijo}`);
    const ids = (await prisma.persona.findMany({ where: { apellido: `Test${sufijo}` }, select: { id: true } })).map((p) => p.id);
    await prisma.notificacion.deleteMany({ where: { alcanceId: { in: ids } } });
    await esc.limpiar();
    await app.close();
  });

  it('con "Ya lo hice" de Vida Nueva en revisión: pedir propio, el Admin o el Discipulador en su nombre → HISTORIAL_VIDA_NUEVA_EN_REVISION', async () => {
    const id = await esc.persona('enrevision');
    expect((await declararVn(id)).status).toBe(201);
    for (const res of [await pedirPropio(id), await pedirEnNombre(adminId, ['miembro_registrado', 'admin'], id), await pedirEnNombre(discId, ['miembro_registrado', 'discipulador'], id)]) {
      expect([res.status, res.body.code]).toEqual([409, 'HISTORIAL_VIDA_NUEVA_EN_REVISION']);
    }
    expect(await prisma.solicitudDiscipulado.count({ where: { personaId: id } })).toBe(0);
  });

  it('después de confirmar: completoEtapa = historial y el pedido → VIDA_NUEVA_COMPLETADA_POR_HISTORIAL (SC-004)', async () => {
    const id = await esc.persona('confirmada');
    const { body } = await declararVn(id);
    await request(app.getHttpServer())
      .post(`/historial/declaraciones/${body.id}/confirmar`)
      .set('Authorization', `Bearer ${await tokenDe(adminId, ['miembro_registrado', 'admin'])}`)
      .expect(200);
    expect(await completoEtapa(prisma, id, 'vida_nueva')).toBe('historial');
    const res = await pedirPropio(id);
    expect([res.status, res.body.code]).toEqual([409, 'VIDA_NUEVA_COMPLETADA_POR_HISTORIAL']);
  });

  it('pedir y declarar a la vez: exactamente uno gana', async () => {
    for (let i = 0; i < 3; i++) {
      const id = await esc.persona(`carrera${i}`);
      const [pedido, declarado] = await Promise.all([pedirPropio(id), declararVn(id)]);
      const ganadores = [pedido.status, declarado.status].filter((s) => s === 201);
      expect({ intento: i, ganadores: ganadores.length }).toEqual({ intento: i, ganadores: 1 });
      const perdedor = pedido.status === 201 ? declarado : pedido;
      expect(['ETAPA_EN_CURSO', 'HISTORIAL_VIDA_NUEVA_EN_REVISION']).toContain(perdedor.body.code);
      const solicitudes = await prisma.solicitudDiscipulado.count({ where: { personaId: id } });
      const declaraciones = await prisma.declaracionHistorial.count({ where: { personaId: id } });
      expect(solicitudes + declaraciones).toBe(1);
    }
  });
});
