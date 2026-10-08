import { esAbierta, type SolicitudBandeja } from '@vida-sobrenatural/shared-types';
import type { FuenteSolicitudes } from '../bandeja/fuente-solicitudes.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { nombresDe } from '../discipulado/consultas.js';

/**
 * spec 006, FR-012 (specs/IMPLEMENTACION.md §2.3): las filas `historial` de la
 * bandeja unificada. La vista ya ordena y pagina; esto hidrata cada fila con
 * la forma base y la etapa en `extra`.
 */
export class FuenteHistorial implements FuenteSolicitudes {
  readonly tipo = 'historial' as const;

  constructor(private readonly prisma: PrismaService) {}

  async resumenes(ids: readonly string[]): Promise<SolicitudBandeja[]> {
    if (ids.length === 0) return [];
    const filas = await this.prisma.declaracionHistorial.findMany({
      where: { id: { in: [...ids] } },
      select: { id: true, personaId: true, etapa: true, estado: true, createdAt: true, creadoPorId: true, revisadoPorId: true, revisadaEn: true },
    });
    const personas = await nombresDe(
      this.prisma,
      filas.flatMap((f) => [f.personaId, f.creadoPorId, f.revisadoPorId].filter((id): id is string => id !== null)),
    );
    const porId = new Map(filas.map((f) => [f.id, f]));
    return ids.flatMap((id) => {
      const f = porId.get(id);
      const persona = f && personas.get(f.personaId);
      if (!f || !persona) return [];
      return [
        {
          tipo: 'historial' as const,
          id: f.id,
          persona,
          estado: f.estado,
          abierta: esAbierta('historial', f.estado),
          createdAt: f.createdAt.toISOString(),
          esperaDesde: f.createdAt.toISOString(),
          creadoPor: f.creadoPorId ? (personas.get(f.creadoPorId) ?? null) : null,
          revisadoPor: f.revisadoPorId ? (personas.get(f.revisadoPorId) ?? null) : null,
          revisadaEn: f.revisadaEn?.toISOString() ?? null,
          extra: { etapa: f.etapa },
        },
      ];
    });
  }
}
