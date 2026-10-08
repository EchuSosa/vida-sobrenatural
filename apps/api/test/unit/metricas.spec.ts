import { MetricasService } from '../../src/inicio/metricas.service.js';
import type { PrismaService } from '../../src/prisma/prisma.service.js';

/** spec 013 (H3.2, H3.4): los rangos de D214 y la base sin Personas activas, con una base falsa. */
function servicio(personas: Array<{ congregaDesde: number; sedeId: string }>, sedes: Array<{ id: string; nombre: string; activo: boolean }>) {
  const agrupar = (clave: 'congregaDesde' | 'sedeId') => {
    const conteo = new Map<string | number, number>();
    for (const p of personas) conteo.set(p[clave], (conteo.get(p[clave]) ?? 0) + 1);
    return [...conteo].map(([valor, n]) => ({ [clave]: valor, _count: { _all: n } }));
  };
  const prisma = {
    persona: {
      count: async () => personas.length,
      groupBy: async ({ by }: { by: ['congregaDesde'] | ['sedeId'] }) => agrupar(by[0]),
    },
    sede: { findMany: async () => sedes },
  } as unknown as PrismaService;
  return new MetricasService(prisma);
}

const AHORA = new Date('2026-10-08T15:00:00Z');

describe('MetricasService', () => {
  it('H3.2: los cuatro rangos siempre, en orden, con uno en 0', async () => {
    const m = await servicio(
      [2026, 2025, 2024, 2023, 2021, 2010, 2010].map((congregaDesde) => ({ congregaDesde, sedeId: 's1' })),
      [{ id: 's1', nombre: 'La Plata', activo: true }],
    ).metricas(AHORA);
    expect(m.porTiempoCongregacion).toEqual([
      { valor: 'este_anio', cantidad: 1 },
      { valor: 'de_1_a_2_anios', cantidad: 2 },
      { valor: 'de_3_a_5_anios', cantidad: 2 },
      { valor: 'mas_de_5_anios', cantidad: 2 },
    ]);
    const sinRecientes = await servicio([{ congregaDesde: 2000, sedeId: 's1' }], []).metricas(AHORA);
    expect(sinRecientes.porTiempoCongregacion.map((r) => r.cantidad)).toEqual([0, 0, 0, 1]);
  });

  it('H3.4: sin Personas activas, todo en 0 y las Sedes igual aparecen', async () => {
    const m = await servicio([], [{ id: 's1', nombre: 'La Plata', activo: true }, { id: 's2', nombre: 'Rosario', activo: false }]).metricas(AHORA);
    expect(m).toEqual({
      personasActivas: 0,
      porTiempoCongregacion: ['este_anio', 'de_1_a_2_anios', 'de_3_a_5_anios', 'mas_de_5_anios'].map((valor) => ({ valor, cantidad: 0 })),
      porSede: [
        { sedeId: 's1', nombre: 'La Plata', activa: true, cantidad: 0 },
        { sedeId: 's2', nombre: 'Rosario', activa: false, cantidad: 0 },
      ],
    });
  });

  it('el año actual es el de Argentina: a las 01:00 UTC del 1/1 todavía es el año anterior', async () => {
    const m = await servicio([{ congregaDesde: 2026, sedeId: 's1' }], []).metricas(new Date('2027-01-01T01:00:00Z'));
    expect(m.porTiempoCongregacion[0]).toEqual({ valor: 'este_anio', cantidad: 1 });
  });
});
