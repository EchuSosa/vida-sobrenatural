import { esAbierta, type SolicitudBandeja } from '@vida-sobrenatural/shared-types';
import type { FuenteSolicitudes } from '../bandeja/fuente-solicitudes.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { nombresDe } from '../discipulado/consultas.js';

/** Lo que Vida de Servicio suma en `extra` de la bandeja: la edición pedida (null = "para la próxima"). */
export type ExtraBandejaVidaDeServicio = { edicion: { grupoId: string; nombre: string } | null };

/**
 * spec 008, FR-014 (specs/IMPLEMENTACION.md §2.3): las filas `vida_de_servicio`
 * de la bandeja unificada. La vista ya ordena y pagina; esto hidrata cada
 * fila con la forma base y la edición pedida en `extra`.
 */
export class FuenteVidaDeServicio implements FuenteSolicitudes {
  readonly tipo = 'vida_de_servicio' as const;

  constructor(private readonly prisma: PrismaService) {}

  async resumenes(ids: readonly string[]): Promise<SolicitudBandeja[]> {
    if (ids.length === 0) return [];
    const filas = await this.prisma.solicitudVidaServicio.findMany({
      where: { id: { in: [...ids] } },
      select: {
        id: true, personaId: true, estado: true, createdAt: true, creadoPorId: true, revisadoPorId: true, revisadaEn: true,
        grupo: { select: { id: true, nombre: true } },
      },
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
      const extra: ExtraBandejaVidaDeServicio = { edicion: f.grupo ? { grupoId: f.grupo.id, nombre: f.grupo.nombre ?? '' } : null };
      return [
        {
          tipo: 'vida_de_servicio' as const,
          id: f.id,
          persona,
          estado: f.estado,
          abierta: esAbierta('vida_de_servicio', f.estado),
          createdAt: f.createdAt.toISOString(),
          esperaDesde: f.createdAt.toISOString(),
          creadoPor: f.creadoPorId ? (personas.get(f.creadoPorId) ?? null) : null,
          revisadoPor: f.revisadoPorId ? (personas.get(f.revisadoPorId) ?? null) : null,
          revisadaEn: f.revisadaEn?.toISOString() ?? null,
          extra,
        },
      ];
    });
  }
}
