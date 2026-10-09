import { esAbierta, type ExtraBandejaGrupoExtension, type SolicitudBandeja } from '@vida-sobrenatural/shared-types';
import type { FuenteSolicitudes } from '../bandeja/fuente-solicitudes.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { nombresDe } from '../discipulado/consultas.js';

/** spec 014, D226 (specs/IMPLEMENTACION.md §2.3): las filas `grupo_extension` de la bandeja, con el Grupo en `extra`. */
export class FuenteGrupoExtension implements FuenteSolicitudes {
  readonly tipo = 'grupo_extension' as const;

  constructor(private readonly prisma: PrismaService) {}

  async resumenes(ids: readonly string[]): Promise<SolicitudBandeja[]> {
    if (ids.length === 0) return [];
    const filas = await this.prisma.solicitudGrupoExtension.findMany({
      where: { id: { in: [...ids] } },
      select: { id: true, personaId: true, estado: true, createdAt: true, creadoPorId: true, revisadoPorId: true, revisadaEn: true, grupo: { select: { nombre: true } } },
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
      const extra: ExtraBandejaGrupoExtension = { grupo: f.grupo.nombre };
      return [
        {
          tipo: 'grupo_extension' as const,
          id: f.id,
          persona,
          estado: f.estado,
          abierta: esAbierta('grupo_extension', f.estado),
          createdAt: f.createdAt.toISOString(),
          esperaDesde: f.createdAt.toISOString(),
          creadoPor: f.creadoPorId ? (personas.get(f.creadoPorId) ?? null) : null,
          revisadoPor: f.revisadoPorId ? (personas.get(f.revisadoPorId) ?? null) : null,
          revisadaEn: f.revisadaEn?.toISOString() ?? null,
          extra: { ...extra },
        },
      ];
    });
  }
}
