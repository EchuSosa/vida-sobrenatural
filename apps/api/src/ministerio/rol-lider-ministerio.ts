import { EDAD_MINIMA_ROL_DE_CARGO, esMenorDeEdad, hoyEnArgentina } from '@vida-sobrenatural/shared-types';
import type { Prisma } from '../generated/prisma/client.js';
import { AppException } from '../common/errors/app-exception.js';
import { registrarCambioDeRol } from '../cambio-de-rol/registrar-cambio-de-rol.js';

/**
 * spec 016 (D244): el rol `lider_ministerio` lo da y lo quita el sistema al
 * asignar o quitar líderes de un Ministerio desde el backoffice — calcado de
 * `grupo-extension/rol-lider.ts` (D226): siempre con su CambioDeRol, en la
 * misma transacción, y nunca a un menor (D133).
 */
export async function otorgarLiderMinisterio(tx: Prisma.TransactionClient, personaId: string, adminId: string): Promise<void> {
  const persona = await tx.persona.findUniqueOrThrow({ where: { id: personaId }, select: { fechaNacimiento: true } });
  if (esMenorDeEdad(persona.fechaNacimiento.toISOString(), hoyEnArgentina())) {
    throw new AppException(
      'PERSONA_MENOR_DE_EDAD_NO_PUEDE_TENER_ROL_DE_CARGO',
      409,
      `Una Persona menor de ${EDAD_MINIMA_ROL_DE_CARGO} años no puede tener un rol de cargo.`,
    );
  }
  const cambiada = await tx.$queryRaw<{ id: string }[]>`
    UPDATE "personas" SET "rol" = array_append("rol", 'lider_ministerio'::text), "updatedAt" = NOW()
    WHERE "id" = ${personaId} AND NOT ('lider_ministerio'::text = ANY("rol"))
    RETURNING "id"`;
  if (cambiada.length > 0) {
    await registrarCambioDeRol(tx, { personaId, rol: 'lider_ministerio', accion: 'otorgado', actor: { origen: 'backoffice', realizadoPorId: adminId } });
  }
}

/** Le quita el rol si ya no lidera ningún Ministerio activo (no eliminado). */
export async function quitarLiderMinisterioSiNoLidera(tx: Prisma.TransactionClient, personaId: string, adminId: string): Promise<void> {
  const lidera = await tx.liderMinisterio.count({ where: { personaId, hasta: null, ministerio: { activo: true, eliminadoEn: null } } });
  if (lidera > 0) return;
  const cambiada = await tx.$queryRaw<{ id: string }[]>`
    UPDATE "personas" SET "rol" = array_remove("rol", 'lider_ministerio'::text), "updatedAt" = NOW()
    WHERE "id" = ${personaId} AND 'lider_ministerio'::text = ANY("rol")
    RETURNING "id"`;
  if (cambiada.length > 0) {
    await registrarCambioDeRol(tx, { personaId, rol: 'lider_ministerio', accion: 'quitado', actor: { origen: 'backoffice', realizadoPorId: adminId } });
  }
}
