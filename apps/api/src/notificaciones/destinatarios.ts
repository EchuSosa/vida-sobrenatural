import type { DestinatarioAviso } from '@vida-sobrenatural/shared-types';
import { Prisma } from '../generated/prisma/client.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { miembrosActivosDe } from '../ministerio/miembros.js';

type Db = PrismaService | Prisma.TransactionClient;

export interface DestinatarioResuelto {
  id: string;
  tieneEmail: boolean;
}

/**
 * spec 012 (FR-015, FR-016) — la ÚNICA resolución de "a quién le llega" un
 * aviso: la usan el envío automático (`NotificacionesService.emitir`) y el
 * conteo previo de los avisos manuales (Principio XI). Siempre Personas
 * `estado = activa` y `activo = true`, en la misma consulta. `admin` → nadie
 * (D201: lo ve en Pendientes del backoffice).
 */
export async function resolverDestinatarios(db: Db, a: DestinatarioAviso): Promise<DestinatarioResuelto[]> {
  const activas = (where: Prisma.Sql) => db.$queryRaw<DestinatarioResuelto[]>`
    SELECT pe."id", (pe."email" IS NOT NULL) AS "tieneEmail" FROM "personas" pe
     WHERE pe."estado" = 'activa' AND pe."activo" = true AND (${where})
     ORDER BY pe."id"`;
  switch (a.tipo) {
    case 'admin':
      return [];
    case 'persona':
    case 'discipulador':
      return activas(Prisma.sql`pe."id" = ${a.personaId}`);
    case 'grupo':
      return activas(Prisma.sql`pe."id" IN (SELECT i."personaId" FROM "inscripciones" i WHERE i."grupoId" = ${a.grupoId} AND i."estado" = 'activa')`);
    case 'lideres_grupo':
      return activas(Prisma.sql`pe."id" IN (SELECT l."personaId" FROM "liderazgos" l WHERE l."grupoId" = ${a.grupoId} AND l."hasta" IS NULL)`);
    case 'ministerio': {
      const ids = await miembrosActivosDe(db, a.ministerioId);
      if (ids.length === 0) return [];
      return activas(Prisma.sql`pe."id" IN (${Prisma.join(ids)})`);
    }
    case 'evento_confirmados':
      return activas(Prisma.sql`pe."id" IN (SELECT ie."personaId" FROM "inscripciones_evento" ie WHERE ie."eventoId" = ${a.eventoId} AND ie."estado" = 'confirmada')`);
    case 'evento_inscriptos':
      return activas(Prisma.sql`pe."id" IN (SELECT ie."personaId" FROM "inscripciones_evento" ie WHERE ie."eventoId" = ${a.eventoId} AND ie."estado" IN ('confirmada', 'pendiente', 'lista_espera'))`);
    case 'todas':
      return activas(Prisma.sql`true`);
    case 'todas_sin_inscripcion':
      return activas(Prisma.sql`NOT EXISTS (SELECT 1 FROM "inscripciones_evento" ie WHERE ie."eventoId" = ${a.eventoId} AND ie."personaId" = pe."id" AND ie."estado" IN ('confirmada', 'pendiente', 'lista_espera'))`);
  }
}
