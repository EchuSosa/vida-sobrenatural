import { Injectable } from '@nestjs/common';
import {
  confirmaNombre,
  normalizarNombre,
  type CelulaCatalogo,
  type DatosMinisterio,
  type EliminadoEnPapelera,
  type MiembroMinisterio,
  type MinisterioCatalogo,
  type MinisterioDetalleCatalogo,
  type MinisterioPublico,
  type Pagina,
} from '@vida-sobrenatural/shared-types';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AppException } from '../common/errors/app-exception.js';
import { errorDeValidacion } from '../discipulado/validaciones.js';
import { nombresDe } from '../discipulado/consultas.js';
import { erroresMinisterio, opcional } from './validar-catalogo.js';
import {
  MINISTERIO_DISPONIBLE,
  ORDEN_MINISTERIOS,
} from './postulacion-persona.service.js';

type Db = PrismaService | Prisma.TransactionClient;

export interface ActualizarMinisterio extends Partial<DatosMinisterio> {
  activo?: boolean;
  confirmacionNombre?: string;
}

/** Conteos por Ministerio (miembros = Postulación aprobada con Persona activa, la definición de `miembros.ts`). */
async function conteos(db: Db, ministerioIds: string[]) {
  if (ministerioIds.length === 0)
    return new Map<
      string,
      {
        miembros: number;
        pendientes: number;
        postulaciones: number;
        celulasActivas: number;
        celulas: number;
      }
    >();
  const filas = await db.$queryRaw<
    {
      id: string;
      miembros: bigint;
      pendientes: bigint;
      postulaciones: bigint;
      celulasActivas: bigint;
      celulas: bigint;
    }[]
  >`
    SELECT m."id",
      (SELECT count(*) FROM "postulaciones" p JOIN "personas" pe ON pe."id" = p."personaId"
        WHERE p."ministerioId" = m."id" AND p."estado" = 'aprobada' AND pe."activo" = true) AS "miembros",
      (SELECT count(*) FROM "postulaciones" p WHERE p."ministerioId" = m."id" AND p."estado" = 'pendiente') AS "pendientes",
      (SELECT count(*) FROM "postulaciones" p WHERE p."ministerioId" = m."id") AS "postulaciones",
      (SELECT count(*) FROM "celulas" c WHERE c."ministerioId" = m."id" AND c."eliminadoEn" IS NULL AND c."activo" = true) AS "celulasActivas",
      (SELECT count(*) FROM "celulas" c WHERE c."ministerioId" = m."id" AND c."eliminadoEn" IS NULL) AS "celulas"
    FROM "ministerios" m WHERE m."id" = ANY(${ministerioIds}::text[])`;
  return new Map(
    filas.map((f) => [
      f.id,
      {
        miembros: Number(f.miembros),
        pendientes: Number(f.pendientes),
        postulaciones: Number(f.postulaciones),
        celulasActivas: Number(f.celulasActivas),
        celulas: Number(f.celulas),
      },
    ]),
  );
}

const SELECT_MINISTERIO = {
  id: true,
  nombre: true,
  descripcion: true,
  lineaPublica: true,
  requiereFormacion: true,
  activo: true,
} as const;
type FilaMinisterio = Prisma.MinisterioGetPayload<{
  select: typeof SELECT_MINISTERIO;
}>;

/**
 * spec 009, Historias 4 y 7 (T038, contracts/ministerios-api.md): el catálogo
 * de Ministerios — mismo patrón que Sedes (D117 inactivar/reactivar, D119
 * papelera, H-129 papelera por su ruta). Unicidad de nombre con
 * `normalizarNombre` entre los no eliminados (research #11).
 */
@Injectable()
export class MinisterioService {
  constructor(private readonly prisma: PrismaService) {}

  /** GET /ministerios/publicos (FR-034): solo nombre y línea pública (docs/22). */
  publicos(): Promise<MinisterioPublico[]> {
    return this.prisma.ministerio.findMany({
      where: MINISTERIO_DISPONIBLE,
      orderBy: [...ORDEN_MINISTERIOS],
      select: { id: true, nombre: true, lineaPublica: true },
    });
  }

  /** GET /ministerios (FR-031): sin eliminados; `activos` por defecto; búsqueda por nombre normalizado. */
  async listar(
    estado: 'activos' | 'todos',
    buscar?: string,
  ): Promise<MinisterioCatalogo[]> {
    const filas = await this.prisma.ministerio.findMany({
      where: {
        eliminadoEn: null,
        ...(estado === 'activos' ? { activo: true } : {}),
      },
      orderBy: [...ORDEN_MINISTERIOS],
      select: SELECT_MINISTERIO,
    });
    const termino = buscar ? normalizarNombre(buscar) : '';
    const filtradas = termino
      ? filas.filter((m) => normalizarNombre(m.nombre).includes(termino))
      : filas;
    const c = await conteos(
      this.prisma,
      filtradas.map((m) => m.id),
    );
    return filtradas.map((m) => aCatalogo(m, c.get(m.id)));
  }

  /** GET /ministerios/papelera (D119). */
  async papelera(): Promise<EliminadoEnPapelera[]> {
    const filas = await this.prisma.ministerio.findMany({
      where: { eliminadoEn: { not: null } },
      orderBy: { eliminadoEn: 'desc' },
      select: { id: true, nombre: true, eliminadoEn: true, eliminadoPor: true },
    });
    const nombres = await nombresDe(
      this.prisma,
      filas.flatMap((f) => (f.eliminadoPor ? [f.eliminadoPor] : [])),
    );
    return filas.map((f) => ({
      id: f.id,
      nombre: f.nombre,
      eliminadoEn: f.eliminadoEn!.toISOString(),
      eliminadoPor: f.eliminadoPor
        ? (nombres.get(f.eliminadoPor) ?? null)
        : null,
    }));
  }

  /** GET /ministerios/:id: con sus Células no eliminadas. */
  async detalle(id: string): Promise<MinisterioDetalleCatalogo> {
    const m = await this.prisma.ministerio.findFirst({
      where: { id, eliminadoEn: null },
      select: SELECT_MINISTERIO,
    });
    if (!m) throw noEncontrado();
    const [c, celulas] = await Promise.all([
      conteos(this.prisma, [id]),
      celulasCatalogo(this.prisma, id),
    ]);
    return { ...aCatalogo(m, c.get(id)), celulas };
  }

  /** GET /ministerios/:id/miembros (FR-032): Postulaciones aprobadas con Persona activa, por apellido. */
  async miembros(
    id: string,
    skip: number,
    take: number,
    buscar?: string,
  ): Promise<Pagina<MiembroMinisterio>> {
    const m = await this.prisma.ministerio.findFirst({
      where: { id, eliminadoEn: null },
      select: { id: true },
    });
    if (!m) throw noEncontrado();
    const termino = buscar?.trim() ? `%${buscar.trim()}%` : null;
    const filtro = Prisma.sql`p."ministerioId" = ${id} AND p."estado" = 'aprobada' AND pe."activo" = true
      AND (${termino}::text IS NULL OR pe."nombre" ILIKE ${termino} OR pe."apellido" ILIKE ${termino})`;
    const [conteo, filas] = await Promise.all([
      this.prisma.$queryRaw<{ total: bigint }[]>`
        SELECT count(*) AS "total" FROM "postulaciones" p JOIN "personas" pe ON pe."id" = p."personaId" WHERE ${filtro}`,
      this.prisma.$queryRaw<
        {
          id: string;
          desde: Date;
          personaId: string;
          nombre: string;
          apellido: string;
          fotoUrl: string | null;
          celulaId: string | null;
          celulaNombre: string | null;
          celulaActivo: boolean | null;
        }[]
      >`
        SELECT p."id", coalesce(p."revisadaEn", p."createdAt") AS "desde",
               pe."id" AS "personaId", pe."nombre", pe."apellido", pe."fotoUrl",
               c."id" AS "celulaId", c."nombre" AS "celulaNombre", (c."activo" AND c."eliminadoEn" IS NULL) AS "celulaActivo"
          FROM "postulaciones" p
          JOIN "personas" pe ON pe."id" = p."personaId"
          LEFT JOIN "celulas" c ON c."id" = p."celulaId"
         WHERE ${filtro}
         ORDER BY pe."apellido", pe."nombre", p."id"
         OFFSET ${skip} LIMIT ${take}`,
    ]);
    return {
      total: Number(conteo[0]?.total ?? 0),
      items: filas.map((f) => ({
        postulacionId: f.id,
        persona: {
          id: f.personaId,
          nombre: f.nombre,
          apellido: f.apellido,
          fotoUrl: f.fotoUrl,
        },
        celula: f.celulaId
          ? {
              id: f.celulaId,
              nombre: f.celulaNombre!,
              activo: !!f.celulaActivo,
            }
          : null,
        desde: f.desde.toISOString(),
      })),
    };
  }

  /** POST /ministerios (FR-026). */
  async crear(dto: DatosMinisterio): Promise<MinisterioCatalogo> {
    const errores = erroresMinisterio(dto, false);
    if (errores.length === 0 && (await this.nombreOcupado(dto.nombre)))
      errores.push({ campo: 'nombre', code: 'MINISTERIO_NOMBRE_DUPLICADO' });
    if (errores.length > 0) throw errorDeValidacion(errores);
    const m = await this.prisma.ministerio.create({
      data: {
        nombre: dto.nombre.trim(),
        descripcion: dto.descripcion.trim(),
        lineaPublica: opcional(dto.lineaPublica) ?? null,
        requiereFormacion: dto.requiereFormacion ?? false,
      },
      select: SELECT_MINISTERIO,
    });
    return aCatalogo(m, undefined);
  }

  /** PATCH /ministerios/:id (FR-026, FR-028, D38): inactivar con miembros o pendientes exige el nombre exacto. */
  async actualizar(
    id: string,
    dto: ActualizarMinisterio,
  ): Promise<MinisterioDetalleCatalogo> {
    const existente = await this.prisma.ministerio.findFirst({
      where: { id, eliminadoEn: null },
      select: { nombre: true, activo: true },
    });
    if (!existente) throw noEncontrado();
    const errores = erroresMinisterio(dto, true);
    if (
      dto.nombre !== undefined &&
      errores.every((e) => e.campo !== 'nombre') &&
      (await this.nombreOcupado(dto.nombre, id))
    ) {
      errores.push({ campo: 'nombre', code: 'MINISTERIO_NOMBRE_DUPLICADO' });
    }
    if (errores.length > 0) throw errorDeValidacion(errores);

    if (dto.activo === false && existente.activo) {
      const c = (await conteos(this.prisma, [id])).get(id)!;
      if (
        (c.miembros > 0 || c.pendientes > 0) &&
        !confirmaNombre(dto.confirmacionNombre, existente.nombre)
      ) {
        throw new AppException(
          'CONFIRMACION_NOMBRE_REQUERIDA',
          409,
          `Tiene ${c.miembros} miembro(s) y ${c.pendientes} postulación(es) pendiente(s): escribí el nombre exacto para confirmar.`,
          undefined,
          {
            miembrosActivos: c.miembros,
            postulacionesPendientes: c.pendientes,
          },
        );
      }
    }
    await this.prisma.ministerio.update({
      where: { id },
      data: {
        ...(dto.nombre !== undefined ? { nombre: dto.nombre.trim() } : {}),
        ...(dto.descripcion !== undefined
          ? { descripcion: dto.descripcion.trim() }
          : {}),
        ...(dto.lineaPublica !== undefined
          ? { lineaPublica: opcional(dto.lineaPublica) ?? null }
          : {}),
        ...(dto.requiereFormacion !== undefined
          ? { requiereFormacion: dto.requiereFormacion }
          : {}),
        ...(dto.activo !== undefined ? { activo: dto.activo } : {}),
      },
    });
    return this.detalle(id);
  }

  /** DELETE /ministerios/:id (FR-030, D119): borrado lógico; nunca con Postulaciones o Células. */
  async eliminar(id: string, eliminadoPor: string): Promise<void> {
    const existente = await this.prisma.ministerio.findFirst({
      where: { id, eliminadoEn: null },
      select: { id: true },
    });
    if (!existente) throw noEncontrado();
    const c = (await conteos(this.prisma, [id])).get(id)!;
    if (c.postulaciones > 0 || c.celulas > 0) {
      throw new AppException(
        'MINISTERIO_TIENE_DATOS_RELACIONADOS',
        409,
        'No se puede eliminar: tiene postulaciones o células. Inactivalo en su lugar.',
      );
    }
    await this.prisma.ministerio.update({
      where: { id },
      data: { eliminadoEn: new Date(), eliminadoPor },
    });
  }

  /** POST /ministerios/:id/restaurar (D119): vuelve con su `activo` de antes. */
  async restaurar(id: string): Promise<MinisterioDetalleCatalogo> {
    const existente = await this.prisma.ministerio.findUnique({
      where: { id },
      select: { nombre: true, eliminadoEn: true },
    });
    if (!existente || !existente.eliminadoEn)
      throw new AppException(
        'NO_ENCONTRADO',
        404,
        'Ese Ministerio no está en la papelera.',
      );
    if (await this.nombreOcupado(existente.nombre, id)) {
      throw new AppException(
        'VALIDACION',
        409,
        'Mientras estuvo en la papelera se creó otro Ministerio con el mismo nombre.',
        [{ campo: 'nombre', code: 'MINISTERIO_NOMBRE_DUPLICADO' }],
      );
    }
    await this.prisma.ministerio.update({
      where: { id },
      data: { eliminadoEn: null, eliminadoPor: null },
    });
    return this.detalle(id);
  }

  private async nombreOcupado(
    nombre: string,
    excepto?: string,
  ): Promise<boolean> {
    const buscado = normalizarNombre(nombre);
    const otros = await this.prisma.ministerio.findMany({
      where: {
        eliminadoEn: null,
        ...(excepto ? { id: { not: excepto } } : {}),
      },
      select: { nombre: true },
    });
    return otros.some((o) => normalizarNombre(o.nombre) === buscado);
  }
}

function aCatalogo(
  m: FilaMinisterio,
  c:
    | {
        miembros: number;
        pendientes: number;
        postulaciones: number;
        celulasActivas: number;
        celulas: number;
      }
    | undefined,
): MinisterioCatalogo {
  return {
    ...m,
    celulasActivas: c?.celulasActivas ?? 0,
    miembrosActivos: c?.miembros ?? 0,
    postulacionesPendientes: c?.pendientes ?? 0,
    tieneDatosRelacionados:
      (c?.postulaciones ?? 0) > 0 || (c?.celulas ?? 0) > 0,
  };
}

/** Las Células no eliminadas de un Ministerio, con sus conteos (FR-027, FR-030). */
export async function celulasCatalogo(
  db: Db,
  ministerioId: string,
  soloId?: string,
): Promise<CelulaCatalogo[]> {
  const filas = await db.$queryRaw<
    {
      id: string;
      nombre: string;
      descripcion: string | null;
      ofreceRolDiscipulador: boolean;
      activo: boolean;
      miembros: bigint;
      pendientes: bigint;
      postulaciones: bigint;
    }[]
  >`
    SELECT c."id", c."nombre", c."descripcion", c."ofreceRolDiscipulador", c."activo",
      (SELECT count(*) FROM "postulaciones" p JOIN "personas" pe ON pe."id" = p."personaId"
        WHERE p."celulaId" = c."id" AND p."estado" = 'aprobada' AND pe."activo" = true) AS "miembros",
      (SELECT count(*) FROM "postulaciones" p WHERE p."celulaId" = c."id" AND p."estado" = 'pendiente') AS "pendientes",
      (SELECT count(*) FROM "postulaciones" p WHERE p."celulaId" = c."id") AS "postulaciones"
    FROM "celulas" c
    WHERE c."ministerioId" = ${ministerioId} AND c."eliminadoEn" IS NULL AND (${soloId ?? null}::text IS NULL OR c."id" = ${soloId ?? null})
    ORDER BY c."nombre"`;
  return filas.map((f) => ({
    id: f.id,
    nombre: f.nombre,
    descripcion: f.descripcion,
    ofreceRolDiscipulador: f.ofreceRolDiscipulador,
    activo: f.activo,
    miembrosActivos: Number(f.miembros),
    postulacionesPendientes: Number(f.pendientes),
    tieneDatosRelacionados: Number(f.postulaciones) > 0,
  }));
}

function noEncontrado() {
  return new AppException('NO_ENCONTRADO', 404, 'No existe ese Ministerio.');
}
