import { Prisma } from '../generated/prisma/client.js';
import type { PrismaService } from '../prisma/prisma.service.js';

type Db = PrismaService | Prisma.TransactionClient;

/**
 * spec 009 (D170, research #12) — la ÚNICA definición de "quiénes están hoy
 * en un Ministerio": Postulación `aprobada` en ese Ministerio (la membresía ES
 * la Postulación aprobada) y Persona `activo = true`. La usan el listado de
 * miembros (009, con paginado) y el alcance `ministerio` de los avisos (012).
 * Lote 0 global: queda acá desde ya porque la consume `resolverDestinatarios`.
 */
export async function miembrosActivosDe(db: Db, ministerioId: string): Promise<string[]> {
  const filas = await db.$queryRaw<{ personaId: string }[]>`
    SELECT p."personaId" FROM "postulaciones" p
      JOIN "personas" pe ON pe."id" = p."personaId"
     WHERE p."ministerioId" = ${ministerioId} AND p."estado" = 'aprobada' AND pe."activo" = true`;
  return filas.map((f) => f.personaId);
}
