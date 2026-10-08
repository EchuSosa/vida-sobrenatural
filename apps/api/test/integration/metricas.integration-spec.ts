import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import { ORDEN_RANGO_CONGREGACION, type Metricas } from '@vida-sobrenatural/shared-types';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import { Escenario, levantarApp, tokenDe } from './discipulado-fixtures.js';

/**
 * spec 013, T041 (Historia 3): las métricas contra la base real. Otros specs
 * corren en paralelo sobre la misma base, así que lo exacto se mira en una
 * Sede propia (H3.1, H3.3) y el reparto por rangos se coteja contra un COUNT
 * directo de las Personas de esa Sede (H3.2). El caso "base vacía" (H3.4) y
 * los rangos exactos están en el unit `metricas.spec.ts`.
 */
describe('Métricas del Inicio (integración, spec 013 T041)', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;
  let escenario: Escenario;
  let admin: string;
  let pastor: string;
  let discipulador: string;
  let sedeInactivaId: string;
  let sedeEliminadaId: string;
  const anio = new Date().getUTCFullYear();

  beforeAll(async () => {
    ({ app, prisma } = await levantarApp());
    const sufijo = `metr${Date.now()}`;
    escenario = new Escenario(prisma, sufijo);
    await escenario.preparar();
    admin = await tokenDe(await escenario.persona('admin', { rol: ['miembro_registrado', 'admin'] }), ['miembro_registrado', 'admin']);
    pastor = await tokenDe(await escenario.persona('pastor', { rol: ['miembro_registrado', 'pastor'] }), ['miembro_registrado', 'pastor']);
    discipulador = await tokenDe(await escenario.persona('disc', { rol: ['miembro_registrado', 'discipulador'] }), ['miembro_registrado', 'discipulador']);

    // H3.1: en la Sede del escenario, 120 activas (contando las tres de arriba), 8 pendientes de tutor y 3 dadas de baja.
    // Entre las activas, un menor ya activado y una sin email. Los años reparten los cuatro rangos menos uno (H3.2: uno en 0 si el resto de la base no aporta).
    const base = {
      apellido: `Test${sufijo}`, genero: 'femenino' as const, fechaNacimiento: new Date('1990-05-20'), telefono: '+5492211234567', direccion: 'Calle 1',
      sedeId: escenario.sedeId, estadoCivil: 'soltero_a' as const, profesion: 'otro' as const, consentimientoDatos: true, rol: ['miembro_registrado'],
    };
    const anios = [anio, anio - 1, anio - 4, anio - 10];
    await prisma.persona.createMany({
      data: Array.from({ length: 117 }, (_, i) => ({
        ...base,
        email: i === 0 ? null : `integ-metr-${i}-${sufijo}@example.com`,
        nombre: `m${i}`,
        congregaDesde: anios[i % anios.length],
        estado: 'activa' as const,
        fechaNacimiento: i === 1 ? new Date(`${anio - 15}-01-01`) : base.fechaNacimiento,
      })),
    });
    await prisma.persona.createMany({
      data: Array.from({ length: 8 }, (_, i) => ({ ...base, email: `integ-metr-pt-${i}-${sufijo}@example.com`, nombre: `pt${i}`, congregaDesde: anio, estado: 'pendiente_tutor' as const })),
    });
    await prisma.persona.createMany({
      data: Array.from({ length: 3 }, (_, i) => ({ ...base, email: `integ-metr-baja-${i}-${sufijo}@example.com`, nombre: `baja${i}`, congregaDesde: anio, estado: 'activa' as const, activo: false })),
    });
    sedeInactivaId = (await prisma.sede.create({ data: { nombre: `Sede inactiva ${sufijo}`, direccion: 'D', horarios: 'H', activo: false }, select: { id: true } })).id;
    sedeEliminadaId = (await prisma.sede.create({ data: { nombre: `Sede eliminada ${sufijo}`, direccion: 'D', horarios: 'H', eliminadoEn: new Date() }, select: { id: true } })).id;
  });

  afterAll(async () => {
    const apellido = (await prisma.persona.findFirstOrThrow({ where: { sedeId: escenario.sedeId }, select: { apellido: true } })).apellido;
    await prisma.persona.deleteMany({ where: { apellido, nombre: { not: { in: ['admin', 'pastor', 'disc'] } } } });
    await prisma.sede.deleteMany({ where: { id: { in: [sedeInactivaId, sedeEliminadaId] } } });
    await escenario.limpiar();
    await app.close();
  });

  const get = (token = admin) => request(app.getHttpServer()).get('/inicio/metricas').set('Authorization', `Bearer ${token}`);

  it('H3.1 y H3.3: cuenta solo las activas, por Sede; una Sede inactiva aparece con activa: false y una eliminada no', async () => {
    const r = await get();
    expect(r.status).toBe(200);
    const m = r.body as Metricas;
    expect(m.porSede.find((s) => s.sedeId === escenario.sedeId)).toMatchObject({ cantidad: 120, activa: true });
    expect(m.porSede.find((s) => s.sedeId === sedeInactivaId)).toMatchObject({ cantidad: 0, activa: false });
    expect(m.porSede.find((s) => s.sedeId === sedeEliminadaId)).toBeUndefined();
    expect(m.personasActivas).toBeGreaterThanOrEqual(120);
  });

  it('H3.2: los cuatro rangos de D214, en orden, y cada uno cubre a las Personas de la Sede que caen en él', async () => {
    const m = (await get()).body as Metricas;
    expect(m.porTiempoCongregacion.map((r) => r.valor)).toEqual([...ORDEN_RANGO_CONGREGACION]);
    // De la Sede: 117 repartidas en 4 años (30, 29, 29, 29) + las 3 del escenario (2020) — COUNT directo.
    const directo = await prisma.persona.groupBy({ by: ['congregaDesde'], where: { sedeId: escenario.sedeId, estado: 'activa', activo: true }, _count: { _all: true } });
    const deLaSede = (desde: number) => directo.find((d) => d.congregaDesde === desde)?._count._all ?? 0;
    const cantidad = (valor: string) => m.porTiempoCongregacion.find((r) => r.valor === valor)!.cantidad;
    expect(cantidad('este_anio')).toBeGreaterThanOrEqual(deLaSede(anio));
    expect(cantidad('de_1_a_2_anios')).toBeGreaterThanOrEqual(deLaSede(anio - 1));
    expect(cantidad('de_3_a_5_anios')).toBeGreaterThanOrEqual(deLaSede(anio - 4));
    expect(cantidad('mas_de_5_anios')).toBeGreaterThanOrEqual(deLaSede(anio - 10) + deLaSede(2020));
  });

  it('el Pastor lee las métricas; un Discipulador no', async () => {
    expect((await get(pastor)).status).toBe(200);
    expect((await get(discipulador)).status).toBe(403);
  });
});
