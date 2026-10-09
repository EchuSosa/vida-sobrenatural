import {
  direccionDelGrupo,
  edadEn,
  generoDelGrupo,
  hoyEnArgentina,
  normalizarWhatsappArgentino,
  ordenarDias,
  type DiaSemana,
  type Genero,
  type GeneroGrupoExtension,
  type IntegranteGex,
  type PersonaContactoGex,
  type SolicitudGexParaLider,
} from '@vida-sobrenatural/shared-types';
import type { Prisma } from '../generated/prisma/client.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { AppException } from '../common/errors/app-exception.js';

/** spec 014 — lecturas compartidas por los servicios de Grupos de Extensión. */

export type Db = PrismaService | Prisma.TransactionClient;

export const SELECT_CONTACTO = {
  id: true,
  nombre: true,
  apellido: true,
  telefono: true,
  email: true,
  genero: true,
  fechaNacimiento: true,
} as const;

export interface PersonaConContacto {
  id: string;
  nombre: string;
  apellido: string;
  telefono: string;
  email: string | null;
  genero: Genero;
  fechaNacimiento: Date;
}

export function contactoDe(p: PersonaConContacto): PersonaContactoGex {
  const telefono = p.telefono?.trim() ? p.telefono.trim() : null;
  return {
    id: p.id,
    nombre: p.nombre,
    apellido: p.apellido,
    telefono,
    email: p.email,
    whatsapp: telefono ? normalizarWhatsappArgentino(telefono) : null,
  };
}

export function edadDe(p: { fechaNacimiento: Date }, hoy = hoyEnArgentina()): number {
  return edadEn(p.fechaNacimiento.toISOString(), hoy);
}

/** Lo que trae `include` de un Grupo para armar cualquier respuesta. */
export const INCLUDE_GRUPO = {
  sede: { select: { nombre: true, direccion: true } },
  lideres: {
    where: { hasta: null },
    orderBy: { desde: 'asc' },
    select: { persona: { select: SELECT_CONTACTO } },
  },
} as const satisfies Prisma.GrupoExtensionInclude;

export type GrupoCargado = Prisma.GrupoExtensionGetPayload<{ include: typeof INCLUDE_GRUPO }>;

export function generoDe(g: GrupoCargado): GeneroGrupoExtension | null {
  return generoDelGrupo(g.lideres.map((l) => l.persona.genero));
}

export function direccionDe(g: GrupoCargado): string {
  return direccionDelGrupo({
    enLaIglesia: g.enLaIglesia,
    calle: g.calle,
    numero: g.numero,
    entreCalle1: g.entreCalle1,
    entreCalle2: g.entreCalle2,
    direccionSede: g.sede?.direccion ?? null,
  });
}

export function diasDe(g: { dias: string[] }): DiaSemana[] {
  return ordenarDias(g.dias as DiaSemana[]);
}

/** Integrantes (Solicitudes `aceptada`) por Grupo. */
export async function contarIntegrantes(db: Db, grupoIds: readonly string[]): Promise<Map<string, number>> {
  if (grupoIds.length === 0) return new Map();
  const filas = await db.solicitudGrupoExtension.groupBy({
    by: ['grupoId'],
    where: { grupoId: { in: [...grupoIds] }, estado: 'aceptada' },
    _count: { _all: true },
  });
  return new Map(filas.map((f) => [f.grupoId, f._count._all]));
}

export async function contarPendientes(db: Db, grupoIds: readonly string[]): Promise<Map<string, number>> {
  if (grupoIds.length === 0) return new Map();
  const filas = await db.solicitudGrupoExtension.groupBy({
    by: ['grupoId'],
    where: { grupoId: { in: [...grupoIds] }, estado: 'pendiente' },
    _count: { _all: true },
  });
  return new Map(filas.map((f) => [f.grupoId, f._count._all]));
}

/** Pendientes e integrantes de un Grupo, con el contacto de cada persona (solo para sus líderes y el backoffice). */
export async function pendientesEIntegrantes(db: Db, grupoId: string): Promise<{ pendientes: SolicitudGexParaLider[]; integrantes: IntegranteGex[] }> {
  const filas = await db.solicitudGrupoExtension.findMany({
    where: { grupoId, estado: { in: ['pendiente', 'aceptada'] } },
    orderBy: { createdAt: 'asc' },
    select: { id: true, estado: true, createdAt: true, revisadaEn: true, persona: { select: SELECT_CONTACTO } },
  });
  const hoy = hoyEnArgentina();
  return {
    pendientes: filas
      .filter((f) => f.estado === 'pendiente')
      .map((f) => ({ id: f.id, persona: { ...contactoDe(f.persona), edad: edadDe(f.persona, hoy) }, desde: f.createdAt.toISOString() })),
    integrantes: filas
      .filter((f) => f.estado === 'aceptada')
      .map((f) => ({ solicitudId: f.id, persona: contactoDe(f.persona), desde: (f.revisadaEn ?? f.createdAt).toISOString() })),
  };
}

/** Bloquea la fila del Grupo hasta el fin de la transacción (cupo y altas concurrentes, research #5). */
export async function bloquearGrupo(tx: Prisma.TransactionClient, grupoId: string): Promise<{ id: string; activo: boolean; cupo: number | null }> {
  const filas = await tx.$queryRaw<Array<{ id: string; activo: boolean; cupo: number | null }>>`
    SELECT "id", "activo", "cupo" FROM "grupos_extension" WHERE "id" = ${grupoId} FOR UPDATE`;
  if (filas.length === 0) throw grupoNoEncontrado();
  return filas[0];
}

export async function hayLugar(tx: Prisma.TransactionClient, grupo: { id: string; cupo: number | null }): Promise<boolean> {
  if (grupo.cupo === null) return true;
  const integrantes = await tx.solicitudGrupoExtension.count({ where: { grupoId: grupo.id, estado: 'aceptada' } });
  return integrantes < grupo.cupo;
}

export function grupoNoEncontrado() {
  return new AppException('NO_ENCONTRADO', 404, 'No existe ese grupo de extensión.');
}

export function solicitudNoEncontrada() {
  return new AppException('NO_ENCONTRADO', 404, 'No existe ese pedido.');
}

export function grupoCompleto() {
  return new AppException('GRUPO_EXTENSION_COMPLETO', 409, 'El grupo está completo: no quedan lugares.');
}

export { esViolacionDeUnico } from '../ministerio/crear-postulacion.js';
