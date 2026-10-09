import { EDAD_MINIMA_ROL_DE_CARGO, esMenorDeEdad, hoyEnArgentina } from '@vida-sobrenatural/shared-types';
import type { Prisma } from '../generated/prisma/client.js';
import { AppException } from '../common/errors/app-exception.js';
import { registrarCambioDeRol } from '../cambio-de-rol/registrar-cambio-de-rol.js';

/**
 * spec 014, D225: el rol `lider_extension` lo da y lo quita el sistema al
 * asignar líderes desde el backoffice — siempre con su CambioDeRol (FR-022 de
 * la 005), en la misma transacción, y nunca a un menor (D133: la garantía
 * está acá, venga el pedido por donde venga).
 */
export async function otorgarLiderExtension(tx: Prisma.TransactionClient, personaId: string, adminId: string): Promise<void> {
  const persona = await tx.persona.findUniqueOrThrow({ where: { id: personaId }, select: { fechaNacimiento: true } });
  if (esMenorDeEdad(persona.fechaNacimiento.toISOString(), hoyEnArgentina())) {
    throw new AppException(
      'PERSONA_MENOR_DE_EDAD_NO_PUEDE_TENER_ROL_DE_CARGO',
      409,
      `Una Persona menor de ${EDAD_MINIMA_ROL_DE_CARGO} años no puede tener un rol de cargo.`,
    );
  }
  const cambiada = await tx.$queryRaw<{ id: string }[]>`
    UPDATE "personas" SET "rol" = array_append("rol", 'lider_extension'::text), "updatedAt" = NOW()
    WHERE "id" = ${personaId} AND NOT ('lider_extension'::text = ANY("rol"))
    RETURNING "id"`;
  if (cambiada.length > 0) {
    await registrarCambioDeRol(tx, { personaId, rol: 'lider_extension', accion: 'otorgado', actor: { origen: 'backoffice', realizadoPorId: adminId } });
  }
}

/** Le quita el rol si ya no lidera ningún Grupo activo. */
export async function quitarLiderExtensionSiNoLidera(tx: Prisma.TransactionClient, personaId: string, adminId: string): Promise<void> {
  const lidera = await tx.liderGrupoExtension.count({ where: { personaId, hasta: null, grupo: { activo: true } } });
  if (lidera > 0) return;
  const cambiada = await tx.$queryRaw<{ id: string }[]>`
    UPDATE "personas" SET "rol" = array_remove("rol", 'lider_extension'::text), "updatedAt" = NOW()
    WHERE "id" = ${personaId} AND 'lider_extension'::text = ANY("rol")
    RETURNING "id"`;
  if (cambiada.length > 0) {
    await registrarCambioDeRol(tx, { personaId, rol: 'lider_extension', accion: 'quitado', actor: { origen: 'backoffice', realizadoPorId: adminId } });
  }
}
