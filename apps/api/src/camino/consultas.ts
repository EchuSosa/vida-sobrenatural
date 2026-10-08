import type { ComoSeCompleto, EtapaCamino } from '@vida-sobrenatural/shared-types';
import type { Prisma } from '../generated/prisma/client.js';
import type { PrismaService } from '../prisma/prisma.service.js';

type Db = PrismaService | Prisma.TransactionClient;

/**
 * spec 006 (D155, FR-016) — la ÚNICA consulta "¿completó esta etapa?". La
 * usan Mi camino, el pedido de Vida Nueva (FR-017) y los prerrequisitos de
 * Vida de Servicio (008), Ministerio (009) y Bautismo (010): nadie
 * reimplementa "por el sistema o por historial" (`docs/04`: los dos caminos).
 *
 * Funciones de transacción sin DI, para que cualquier módulo las importe sin
 * ciclos (research #5). Cuando importa (pedir, declarar, registrar), quien
 * llama bloquea antes la fila de la Persona con `bloquearPersona`.
 *
 * Fuente "por el sistema" de cada etapa:
 * - vida_nueva / vida_de_servicio: una Inscripción `completada` en un Grupo
 *   de un Curso de esa categoría (individual o grupal cuentan igual).
 * - bautismo: una Solicitud de Bautismo `realizada` (D180).
 * - ministerio: ninguna todavía — solo cuenta la Completitud Manual. La spec
 *   009 decide si una Postulación aprobada la completa (ver
 *   specs/IMPLEMENTACION.md) y, si es así, la suma ACÁ.
 */
export async function completoPorSistema(db: Db, personaId: string, etapa: EtapaCamino): Promise<boolean> {
  switch (etapa) {
    case 'vida_nueva':
    case 'vida_de_servicio': {
      const inscripcion = await db.inscripcion.findFirst({
        where: { personaId, estado: 'completada', grupo: { curso: { categoria: etapa } } },
        select: { id: true },
      });
      return inscripcion !== null;
    }
    case 'bautismo': {
      const solicitud = await db.solicitudBautismo.findFirst({ where: { personaId, estado: 'realizada' }, select: { id: true } });
      return solicitud !== null;
    }
    case 'ministerio':
      return false;
  }
}

/** La Completitud Manual vigente (no anulada) de esa etapa, si hay. */
export async function completitudVigente(db: Db, personaId: string, etapa: EtapaCamino): Promise<{ id: string } | null> {
  return db.completitudManual.findFirst({ where: { personaId, etapa, anuladaEn: null }, select: { id: true } });
}

/** FR-016: ¿completó la etapa, y por qué camino? `null` = no la completó. */
export async function completoEtapa(db: Db, personaId: string, etapa: EtapaCamino): Promise<ComoSeCompleto | null> {
  if (await completoPorSistema(db, personaId, etapa)) return 'sistema';
  if (await completitudVigente(db, personaId, etapa)) return 'historial';
  return null;
}

/**
 * research #5 (patrón D137/H-142): bloquea la fila de la Persona hasta el fin
 * de la transacción, para que pedir Vida Nueva, declararla y registrar su
 * Completitud no se pisen por una carrera. Devuelve si existe.
 */
export async function bloquearPersona(tx: Prisma.TransactionClient, personaId: string): Promise<boolean> {
  const filas = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "personas" WHERE "id" = ${personaId} FOR UPDATE`;
  return filas.length > 0;
}
