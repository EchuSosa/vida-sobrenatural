import {
  esAbierta,
  type ExtraBandejaPostulacion,
  type SolicitudBandeja,
} from '@vida-sobrenatural/shared-types';
import type { FuenteSolicitudes } from '../bandeja/fuente-solicitudes.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { nombresDe } from '../discipulado/consultas.js';

/**
 * spec 009, FR-015 (specs/IMPLEMENTACION.md §2.3): las filas `postulacion` de
 * la bandeja unificada. La vista ya ordena y pagina; esto hidrata cada fila
 * con la forma base y, en `extra`, el Ministerio, la Célula y la marca de
 * "requiere formación" (docs/22) para la columna "Detalle".
 */
export class FuentePostulacion implements FuenteSolicitudes {
  readonly tipo = 'postulacion' as const;

  constructor(private readonly prisma: PrismaService) {}

  async resumenes(ids: readonly string[]): Promise<SolicitudBandeja[]> {
    if (ids.length === 0) return [];
    const filas = await this.prisma.postulacion.findMany({
      where: { id: { in: [...ids] } },
      select: {
        id: true,
        personaId: true,
        estado: true,
        createdAt: true,
        creadoPorId: true,
        revisadoPorId: true,
        revisadaEn: true,
        requiereFormacion: true,
        ministerio: { select: { nombre: true } },
        celula: { select: { nombre: true } },
      },
    });
    const personas = await nombresDe(
      this.prisma,
      filas.flatMap((f) =>
        [f.personaId, f.creadoPorId, f.revisadoPorId].filter(
          (id): id is string => id !== null,
        ),
      ),
    );
    const porId = new Map(filas.map((f) => [f.id, f]));
    return ids.flatMap((id) => {
      const f = porId.get(id);
      const persona = f && personas.get(f.personaId);
      if (!f || !persona) return [];
      const extra: ExtraBandejaPostulacion = {
        ministerio: f.ministerio.nombre,
        celula: f.celula?.nombre ?? null,
        requiereFormacion: f.requiereFormacion,
      };
      return [
        {
          tipo: 'postulacion' as const,
          id: f.id,
          persona,
          estado: f.estado,
          abierta: esAbierta('postulacion', f.estado),
          createdAt: f.createdAt.toISOString(),
          esperaDesde: f.createdAt.toISOString(),
          creadoPor: f.creadoPorId
            ? (personas.get(f.creadoPorId) ?? null)
            : null,
          revisadoPor: f.revisadoPorId
            ? (personas.get(f.revisadoPorId) ?? null)
            : null,
          revisadaEn: f.revisadaEn?.toISOString() ?? null,
          extra: { ...extra },
        },
      ];
    });
  }
}
