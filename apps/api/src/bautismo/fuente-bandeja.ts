import { esAbierta, type SolicitudBandeja } from '@vida-sobrenatural/shared-types';
import type { FuenteSolicitudes } from '../bandeja/fuente-solicitudes.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { nombresDe } from '../discipulado/consultas.js';

/** Lo que Bautismo suma en `extra`: su Evento asignado, si tiene ("Esperando fecha" si no, FR-006/FR-007). */
export type ExtraBandejaBautismo = { evento: { id: string; nombre: string; inicio: string } | null };

/**
 * spec 010, FR-006 (IMPLEMENTACION §2.3): las filas `bautismo` de la bandeja
 * unificada. La vista ya ordena y pagina; esto hidrata cada fila con la forma
 * base y el Evento asignado en `extra`.
 */
export class FuenteBautismo implements FuenteSolicitudes {
  readonly tipo = 'bautismo' as const;

  constructor(private readonly prisma: PrismaService) {}

  async resumenes(ids: readonly string[]): Promise<SolicitudBandeja[]> {
    if (ids.length === 0) return [];
    const filas = await this.prisma.solicitudBautismo.findMany({
      where: { id: { in: [...ids] } },
      select: {
        id: true,
        personaId: true,
        estado: true,
        createdAt: true,
        creadoPorId: true,
        revisadoPorId: true,
        revisadaEn: true,
        inscripcionEvento: { select: { estado: true, evento: { select: { id: true, nombre: true, inicio: true } } } },
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
      const insc = f.inscripcionEvento;
      const extra: ExtraBandejaBautismo = {
        evento: insc && insc.estado !== 'cancelada' ? { id: insc.evento.id, nombre: insc.evento.nombre, inicio: insc.evento.inicio.toISOString() } : null,
      };
      return [
        {
          tipo: 'bautismo' as const,
          id: f.id,
          persona,
          estado: f.estado,
          abierta: esAbierta('bautismo', f.estado),
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
