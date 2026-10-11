import { esAbierta, type SolicitudBandeja } from '@vida-sobrenatural/shared-types';
import type { FuenteSolicitudes } from '../bandeja/fuente-solicitudes.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { nombresDe } from '../discipulado/consultas.js';
import { ordenarOpciones } from './consultas.js';

/** Lo que la elección suma en `extra`: la edición y las áreas elegidas ("Bienvenida · Consolidadores"). */
export type ExtraBandejaEleccion = { edicion: string; opciones: string[] };

/** spec 015, D242: las filas `eleccion_ministerio` de la bandeja. La espera cuenta desde la charla. */
export class FuenteEleccionMinisterio implements FuenteSolicitudes {
  readonly tipo = 'eleccion_ministerio' as const;

  constructor(private readonly prisma: PrismaService) {}

  async resumenes(ids: readonly string[]): Promise<SolicitudBandeja[]> {
    if (ids.length === 0) return [];
    const filas = await this.prisma.eleccionMinisterio.findMany({
      where: { id: { in: [...ids] } },
      select: {
        id: true,
        personaId: true,
        estado: true,
        createdAt: true,
        charlaEn: true,
        cargadaPorId: true,
        resueltaPorId: true,
        resueltaEn: true,
        grupo: { select: { nombre: true } },
        opciones: { select: { enParalelo: true, ministerio: { select: { nombre: true } }, celula: { select: { nombre: true } } } },
      },
    });
    const personas = await nombresDe(
      this.prisma,
      filas.flatMap((f) => [f.personaId, f.cargadaPorId, f.resueltaPorId].filter((id): id is string => id !== null)),
    );
    const porId = new Map(filas.map((f) => [f.id, f]));
    return ids.flatMap((id) => {
      const f = porId.get(id);
      const persona = f && personas.get(f.personaId);
      if (!f || !persona) return [];
      const extra: ExtraBandejaEleccion = {
        edicion: f.grupo.nombre ?? '',
        opciones: ordenarOpciones(f.opciones).map((o) => `${o.ministerio.nombre} · ${o.celula.nombre}`),
      };
      return [
        {
          tipo: 'eleccion_ministerio' as const,
          id: f.id,
          persona,
          estado: f.estado,
          abierta: esAbierta('eleccion_ministerio', f.estado),
          createdAt: f.createdAt.toISOString(),
          esperaDesde: (f.charlaEn ?? f.createdAt).toISOString(),
          creadoPor: f.cargadaPorId ? (personas.get(f.cargadaPorId) ?? null) : null,
          revisadoPor: f.resueltaPorId ? (personas.get(f.resueltaPorId) ?? null) : null,
          revisadaEn: f.resueltaEn?.toISOString() ?? null,
          extra: { ...extra },
        },
      ];
    });
  }
}
