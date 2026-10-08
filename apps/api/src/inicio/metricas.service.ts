import { Injectable } from '@nestjs/common';
import { ORDEN_RANGO_CONGREGACION, hoyEnArgentina, rangoCongregacion, type Metricas, type RangoCongregacion } from '@vida-sobrenatural/shared-types';
import { PrismaService } from '../prisma/prisma.service.js';

/**
 * spec 013, Historia 3 (T040, research #7): cómo está la iglesia hoy. Tres
 * consultas agregadas sobre las Personas activas (`estado = activa` y
 * `activo = true`): el total, por año en que empezaron a venir (D214: el
 * rango se calcula acá con `rangoCongregacion`, nunca se guarda) y por Sede.
 */
@Injectable()
export class MetricasService {
  constructor(private readonly prisma: PrismaService) {}

  async metricas(ahora: Date = new Date()): Promise<Metricas> {
    const activas = { estado: 'activa' as const, activo: true };
    const anioActual = Number(hoyEnArgentina(ahora).slice(0, 4));
    const [personasActivas, porAnio, porSedeId, sedes] = await Promise.all([
      this.prisma.persona.count({ where: activas }),
      this.prisma.persona.groupBy({ by: ['congregaDesde'], where: activas, _count: { _all: true } }),
      this.prisma.persona.groupBy({ by: ['sedeId'], where: activas, _count: { _all: true } }),
      this.prisma.sede.findMany({ where: { eliminadoEn: null }, select: { id: true, nombre: true, activo: true }, orderBy: [{ nombre: 'asc' }, { id: 'asc' }] }),
    ]);

    // Los cuatro rangos siempre, en orden; uno sin Personas va en 0 (H3.2).
    const porRango = new Map<RangoCongregacion, number>(ORDEN_RANGO_CONGREGACION.map((r) => [r, 0]));
    for (const fila of porAnio) {
      const rango = rangoCongregacion(fila.congregaDesde, anioActual);
      porRango.set(rango, (porRango.get(rango) ?? 0) + fila._count._all);
    }
    const cantidadPorSede = new Map(porSedeId.map((f) => [f.sedeId, f._count._all]));

    return {
      personasActivas,
      porTiempoCongregacion: ORDEN_RANGO_CONGREGACION.map((valor) => ({ valor, cantidad: porRango.get(valor) ?? 0 })),
      porSede: sedes.map((s) => ({ sedeId: s.id, nombre: s.nombre, activa: s.activo, cantidad: cantidadPorSede.get(s.id) ?? 0 })),
    };
  }
}
