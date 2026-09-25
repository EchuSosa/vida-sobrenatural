import type { RolDeCargo } from '@vida-sobrenatural/shared-types';
import type { Prisma, PrismaClient } from '../generated/prisma/client.js';
import type { AccionCambioRol } from '../generated/prisma/enums.js';

/**
 * H-140/H-141: quién hizo un cambio de rol, como ACTOR DISCRIMINADO — nunca
 * un autor opcional con un `origen` al lado, que dejaría en prosa la
 * invariante "toda fila de backoffice tiene autor" (nada impediría
 * `{ origen: 'backoffice', realizadoPorId: null }`). Acá el tipo no deja
 * construirla, y en la base la sostienen dos CHECK
 * (migración 20260925204725_cambio_de_rol).
 * - `backoffice`: un Admin identificado desde la app — `realizadoPorId` es
 *   obligatorio por tipo (`string`, no `string | null`).
 * - `recuperacion_cli`: el comando db:recrear-admin (FR-003), corrido por
 *   quien tenga acceso al servidor. Sin autor: la app no puede nombrarlo, y
 *   no se inventa uno.
 */
export type ActorDeCambioDeRol =
  | { origen: 'backoffice'; realizadoPorId: string }
  | { origen: 'recuperacion_cli' };

export interface CambioDeRolARegistrar {
  personaId: string;
  rol: RolDeCargo;
  accion: AccionCambioRol;
  actor: ActorDeCambioDeRol;
}

/** Un PrismaClient (el CLI) o el cliente de una transacción en curso (la app). */
type ClienteDb = PrismaClient | Prisma.TransactionClient;

/**
 * specs/005, Historia 6 (FR-022): la ÚNICA escritura de CambioDeRol — la usan
 * CambioDeRolService (la app) y scripts/recrear-admin.ts (el CLI), así los
 * dos caminos que otorgan un rol de cargo registran igual. Solo INSERT:
 * nada en la app actualiza ni borra una fila de esta tabla (FR-023).
 */
export async function registrarCambioDeRol(
  db: ClienteDb,
  cambio: CambioDeRolARegistrar,
): Promise<void> {
  await db.cambioDeRol.create({
    data: {
      personaId: cambio.personaId,
      rol: cambio.rol,
      accion: cambio.accion,
      origen: cambio.actor.origen,
      realizadoPorId:
        cambio.actor.origen === 'backoffice'
          ? cambio.actor.realizadoPorId
          : null,
    },
  });
}
