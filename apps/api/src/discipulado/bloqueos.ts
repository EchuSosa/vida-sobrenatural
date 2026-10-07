import type { Prisma } from '../generated/prisma/client.js';
import { AppException } from '../common/errors/app-exception.js';

/**
 * specs/004, lote B: las lecturas con `SELECT … FOR UPDATE` que ordenan las
 * transiciones del discipulado (mismo patrón que `RolesService`, H-142). Cada
 * una bloquea la fila hasta el fin de la transacción: la otra transición que
 * llegue a la misma fila espera y lee lo que dejó la primera. Si la fila no
 * existe, 404 `NO_ENCONTRADO` (Principio V: lo ajeno y lo inexistente se ven
 * igual).
 */

type Tx = Prisma.TransactionClient;

function noEncontrado(): AppException {
  return new AppException('NO_ENCONTRADO', 404, 'No encontramos lo que buscabas.');
}

export interface PropuestaBloqueada {
  id: string;
  tipo: 'nueva' | 'reasignacion';
  solicitudId: string | null;
  grupoId: string | null;
  discipuladorId: string;
  grupoDestinoId: string | null;
  propuestaPorId: string;
  estado: 'pendiente' | 'aceptada' | 'declinada' | 'retirada';
}

export async function bloquearPropuesta(tx: Tx, propuestaId: string): Promise<PropuestaBloqueada> {
  const filas = await tx.$queryRaw<PropuestaBloqueada[]>`
    SELECT "id", "tipo"::text AS "tipo", "solicitudId", "grupoId", "discipuladorId", "grupoDestinoId", "propuestaPorId", "estado"::text AS "estado"
    FROM "propuestas_discipulado" WHERE "id" = ${propuestaId} FOR UPDATE`;
  if (filas.length === 0) throw noEncontrado();
  return filas[0];
}

/** La propuesta de reasignación pendiente de un Grupo, bloqueada (a lo sumo una: índice único parcial). */
export async function bloquearReasignacionPendiente(tx: Tx, grupoId: string): Promise<PropuestaBloqueada | null> {
  const filas = await tx.$queryRaw<PropuestaBloqueada[]>`
    SELECT "id", "tipo"::text AS "tipo", "solicitudId", "grupoId", "discipuladorId", "grupoDestinoId", "propuestaPorId", "estado"::text AS "estado"
    FROM "propuestas_discipulado" WHERE "grupoId" = ${grupoId} AND "tipo" = 'reasignacion' AND "estado" = 'pendiente' FOR UPDATE`;
  return filas[0] ?? null;
}

export interface PersonaBloqueada {
  id: string;
  rol: string[];
  activo: boolean;
  disponibleDiscipulado: boolean;
  maxPersonasPorGrupo: number;
}

/** D137: la fila `personas` del Discipulador, la misma que bloquea `quitarRol` — así "quitar el rol" y "aceptar" no se cruzan. */
export async function bloquearPersona(tx: Tx, personaId: string): Promise<PersonaBloqueada> {
  const filas = await tx.$queryRaw<PersonaBloqueada[]>`
    SELECT "id", "rol", "activo", "disponibleDiscipulado", "maxPersonasPorGrupo"
    FROM "personas" WHERE "id" = ${personaId} FOR UPDATE`;
  if (filas.length === 0) throw noEncontrado();
  return filas[0];
}

export interface GrupoBloqueado {
  id: string;
  estado: 'en_curso' | 'finalizado';
  propuestaFinalizacionEn: Date | null;
}

export async function bloquearGrupo(tx: Tx, grupoId: string): Promise<GrupoBloqueado> {
  const filas = await tx.$queryRaw<GrupoBloqueado[]>`
    SELECT "id", "estado"::text AS "estado", "propuestaFinalizacionEn"
    FROM "grupos" WHERE "id" = ${grupoId} FOR UPDATE`;
  if (filas.length === 0) throw noEncontrado();
  return filas[0];
}

export interface InscripcionBloqueada {
  id: string;
  grupoId: string;
  personaId: string;
  estado: 'activa' | 'completada' | 'dada_de_baja' | 'abandono';
  bajaPropuestaEn: Date | null;
}

/** Una Inscripción de ESTE Grupo; la de otro Grupo es, para este pedido, inexistente (404). */
export async function bloquearInscripcion(tx: Tx, grupoId: string, inscripcionId: string): Promise<InscripcionBloqueada> {
  const filas = await tx.$queryRaw<InscripcionBloqueada[]>`
    SELECT "id", "grupoId", "personaId", "estado"::text AS "estado", "bajaPropuestaEn"
    FROM "inscripciones" WHERE "id" = ${inscripcionId} AND "grupoId" = ${grupoId} FOR UPDATE`;
  if (filas.length === 0) throw noEncontrado();
  return filas[0];
}
