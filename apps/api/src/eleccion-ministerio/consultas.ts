import type {
  DatosConocidos,
  MinisterioParaValidar,
  MinisterioParaElegir,
  OpcionVista,
} from '@vida-sobrenatural/shared-types';
import type { Prisma } from '../generated/prisma/client.js';
import type { PrismaService } from '../prisma/prisma.service.js';

type Db = PrismaService | Prisma.TransactionClient;

/**
 * spec 015 (D239, docs/22): el listado para elegir — los Ministerios activos con
 * sus áreas activas, en el orden del catálogo (nombre). Un Ministerio sin
 * áreas (Ceremonial, Mesa de entrada…) se elige entero.
 */
export async function catalogoParaElegir(db: Db): Promise<MinisterioParaElegir[]> {
  const ministerios = await db.ministerio.findMany({
    where: { activo: true, eliminadoEn: null },
    orderBy: { nombre: 'asc' },
    select: {
      id: true,
      nombre: true,
      descripcion: true,
      requiereFormacion: true,
      celulas: {
        where: { activo: true, eliminadoEn: null },
        orderBy: { nombre: 'asc' },
        select: { id: true, nombre: true, descripcion: true, ofreceRolDiscipulador: true },
      },
    },
  });
  return ministerios.map((m) => ({
      id: m.id,
      nombre: m.nombre,
      descripcion: m.descripcion,
      requiereFormacion: m.requiereFormacion,
    areas: m.celulas.map((c) => ({ id: c.id, nombre: c.nombre, descripcion: c.descripcion, enParalelo: c.ofreceRolDiscipulador })),
  }));
}

/** Lo que `validarEleccionMinisterio` necesita saber de cada Ministerio pedido (los que no existen quedan afuera). */
export async function ministeriosParaValidar(db: Db, ministerioIds: readonly string[]): Promise<Map<string, MinisterioParaValidar>> {
  const ministerios = await db.ministerio.findMany({
    where: { id: { in: [...new Set(ministerioIds)] } },
    select: {
      id: true,
      activo: true,
      eliminadoEn: true,
      celulas: { where: { activo: true, eliminadoEn: null }, select: { id: true, ofreceRolDiscipulador: true } },
    },
  });
  return new Map(
    ministerios.map((m) => [
      m.id,
      { disponible: m.activo && !m.eliminadoEn, areas: new Map(m.celulas.map((c) => [c.id, { enParalelo: c.ofreceRolDiscipulador }])) },
    ]),
  );
}

/** D239: lo que la app ya sabe de la persona (nombre, celular y su grupo de extensión con sus líderes). */
export async function datosConocidos(db: Db, personaId: string): Promise<DatosConocidos> {
  const [persona, gex] = await Promise.all([
    db.persona.findUniqueOrThrow({ where: { id: personaId }, select: { nombre: true, apellido: true, telefono: true } }),
    // spec 014 (D225): la pertenencia ES la Solicitud `aceptada`.
    db.solicitudGrupoExtension.findFirst({
      where: { personaId, estado: 'aceptada' },
      orderBy: { createdAt: 'desc' },
      select: {
        grupo: {
          select: {
            nombre: true,
            lideres: { where: { hasta: null }, orderBy: { desde: 'asc' }, select: { persona: { select: { nombre: true, apellido: true } } } },
          },
        },
      },
    }),
  ]);
  return {
    nombre: persona.nombre,
    apellido: persona.apellido,
    telefono: persona.telefono,
    grupoExtension: gex ? { nombre: gex.grupo.nombre, lideres: gex.grupo.lideres.map((l) => `${l.persona.nombre} ${l.persona.apellido}`) } : null,
  };
}

/** El `select` de las opciones con lo que muestran todas las vistas. */
export const SELECT_OPCION = {
  id: true,
  enParalelo: true,
  resultado: true,
  motivoDescarte: true,
  resueltaPorId: true,
  resueltaEn: true,
  ministerio: { select: { id: true, nombre: true, activo: true, eliminadoEn: true, requiereFormacion: true } },
  celula: { select: { id: true, nombre: true, activo: true, eliminadoEn: true, ofreceRolDiscipulador: true } },
} as const satisfies Prisma.OpcionEleccionMinisterioSelect;

export type OpcionCargada = Prisma.OpcionEleccionMinisterioGetPayload<{ select: typeof SELECT_OPCION }>;

/** Las opciones en el orden de la vista: las de un Ministerio primero (por nombre), la en paralelo al final. */
export function ordenarOpciones<T extends { enParalelo: boolean; ministerio: { nombre: string } }>(opciones: readonly T[]): T[] {
  return [...opciones].sort((a, b) => Number(a.enParalelo) - Number(b.enParalelo) || a.ministerio.nombre.localeCompare(b.ministerio.nombre, 'es'));
}

export function opcionVista(o: OpcionCargada): OpcionVista {
  return {
    id: o.id,
    ministerio: { id: o.ministerio.id, nombre: o.ministerio.nombre },
    celula: o.celula ? { id: o.celula.id, nombre: o.celula.nombre } : null,
    enParalelo: o.enParalelo,
    requiereFormacion: o.ministerio.requiereFormacion,
    resultado: o.resultado,
    disponible: o.ministerio.activo && !o.ministerio.eliminadoEn && (!o.celula || (o.celula.activo && !o.celula.eliminadoEn)),
  };
}

/**
 * La edición de Vida de Servicio en curso de la persona (Inscripción `activa`),
 * si tiene. La elección es de esa edición.
 */
export async function edicionEnCursoDe(db: Db, personaId: string): Promise<{ id: string; nombre: string; eleccionAbierta: boolean } | null> {
  const inscripcion = await db.inscripcion.findFirst({
    where: { personaId, estado: 'activa', grupo: { estado: 'en_curso', curso: { categoria: 'vida_de_servicio' } } },
    orderBy: { createdAt: 'desc' },
    select: { grupo: { select: { id: true, nombre: true, eleccionAbierta: true } } },
  });
  return inscripcion ? { id: inscripcion.grupo.id, nombre: inscripcion.grupo.nombre ?? '', eleccionAbierta: inscripcion.grupo.eleccionAbierta } : null;
}
