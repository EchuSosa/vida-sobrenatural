import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { Server } from 'node:http';
import { RolesService } from '../../src/persona/roles.service.js';
import type { PrismaService } from '../../src/prisma/prisma.service.js';
import { CruceService } from '../../src/discipulado/cruce.service.js';
import { Escenario, levantarApp, MARTES_19_A_21, tokenDe } from './discipulado-fixtures.js';

/**
 * specs/004, T029 (FR-006, FR-034, FR-036, D137): proponer contra la base
 * real, por `POST /discipulado/solicitudes/:id/proponer` (lote A, T024). La
 * Solicitud `pendiente` se arma por Prisma igual que la deja
 * `POST /discipulado/solicitudes/me`: acá se prueba proponer, no pedir.
 */
describe('Proponer un Discipulador (integración)', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;
  let esc: Escenario;
  let admin: string;

  beforeAll(async () => {
    ({ app, prisma } = await levantarApp());
    esc = new Escenario(prisma, `prop-${Date.now()}`);
    await esc.preparar();
    admin = await esc.persona('admin', { rol: ['miembro_registrado', 'admin'] });
  });

  afterAll(async () => {
    await esc.limpiar();
    await app.close();
  });

  it('el índice único parcial rechaza una segunda Propuesta pendiente de la misma Solicitud aunque se saltee el servicio', async () => {
    const disc = await esc.discipulador('disc');
    const persona = await esc.persona('ana');
    const { solicitudId } = await esc.propuestaNueva(persona, disc, admin);
    await expect(
      prisma.propuestaDiscipulado.create({ data: { tipo: 'nueva', solicitudId, discipuladorId: disc, propuestaPorId: admin } }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });

  it('el cruce de una Solicitud no incluye al Discipulador sin agenda ni al que tiene un bloqueo vigente', async () => {
    const conAgenda = await esc.discipulador('agenda');
    const sinAgenda = await esc.persona('sinagenda', { rol: ['miembro_registrado', 'discipulador'] });
    await prisma.persona.update({ where: { id: sinAgenda }, data: { disponibleDiscipulado: true } });
    const bloqueado = await esc.discipulador('bloqueado');
    const hoy = new Date();
    const ayer = new Date(hoy.getTime() - 86_400_000);
    const maniana = new Date(hoy.getTime() + 86_400_000);
    await prisma.bloqueoDisponibilidad.create({ data: { personaId: bloqueado, desde: ayer, hasta: maniana } });

    const cruce = await app.get(CruceService).cruce([MARTES_19_A_21], 'femenino', undefined);
    const ids = [...cruce.franjas.flatMap((f) => f.coinciden), ...cruce.noCoinciden].map((d) => d.id);
    expect(ids).toContain(conAgenda);
    expect(ids).not.toContain(sinAgenda);
    expect(ids).not.toContain(bloqueado);
  });

  /** Una Solicitud `pendiente` con la franja del martes, como la deja `POST /discipulado/solicitudes/me` (lote A). */
  async function solicitudPendiente(clave: string): Promise<string> {
    const persona = await esc.persona(clave);
    const solicitud = await prisma.solicitudDiscipulado.create({
      data: { personaId: persona, estado: 'pendiente', franjas: { create: [MARTES_19_A_21] } },
      select: { id: true },
    });
    return solicitud.id;
  }

  const proponer = async (solicitudId: string, discipuladorId: string) =>
    request(app.getHttpServer())
      .post(`/discipulado/solicitudes/${solicitudId}/proponer`)
      .set('Authorization', `Bearer ${await tokenDe(admin, ['miembro_registrado', 'admin'])}`)
      .send({ discipuladorId });

  it('proponer deja la Solicitud `propuesta` con su Propuesta `pendiente` y NINGÚN Grupo', async () => {
    const disc = await esc.discipulador('disc-p1');
    const solicitudId = await solicitudPendiente('bea');
    const res = await proponer(solicitudId, disc);
    expect(res.status).toBeLessThan(300);
    expect((await prisma.solicitudDiscipulado.findUnique({ where: { id: solicitudId }, select: { estado: true, grupoId: true } }))).toEqual({
      estado: 'propuesta',
      grupoId: null,
    });
    expect(await prisma.propuestaDiscipulado.count({ where: { solicitudId, estado: 'pendiente' } })).toBe(1);
    expect(await prisma.liderazgo.count({ where: { personaId: disc } })).toBe(0);
  });

  it('dos propuestas simultáneas de la misma Solicitud dejan una sola (la otra recibe 409)', async () => {
    const [d1, d2] = [await esc.discipulador('disc-p2'), await esc.discipulador('disc-p3')];
    const solicitudId = await solicitudPendiente('cami');
    const respuestas = await Promise.all([proponer(solicitudId, d1), proponer(solicitudId, d2)]);
    expect(respuestas.map((r) => r.status).sort((a, b) => a - b)).toEqual([200, 409]);
    expect(await prisma.propuestaDiscipulado.count({ where: { solicitudId, estado: 'pendiente' } })).toBe(1);
  });

  it('carrera de D137: quitarRol(discipulador) y proponer en paralelo nunca dejan una Propuesta pendiente de alguien sin el rol', async () => {
    const disc = await esc.discipulador('disc-p4');
    const solicitudId = await solicitudPendiente('dora');
    await Promise.allSettled([app.get(RolesService).quitarRol(disc, 'discipulador', admin), proponer(solicitudId, disc)]);
    const [persona, pendientes] = await Promise.all([
      prisma.persona.findUnique({ where: { id: disc }, select: { rol: true } }),
      prisma.propuestaDiscipulado.count({ where: { discipuladorId: disc, estado: 'pendiente' } }),
    ]);
    if (pendientes > 0) expect(persona?.rol).toContain('discipulador');
  });
});
