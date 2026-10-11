import {
  decisionAlAprobar,
  type DecisionMembresia,
  type DetalleDecisionMembresia,
  type MembresiaActual,
} from '@vida-sobrenatural/shared-types';
import type { Prisma } from '../generated/prisma/client.js';
import { AppException } from '../common/errors/app-exception.js';

type Db = Prisma.TransactionClient;

/** D241: las membresías (aprobadas) de un carril — el de los Ministerios o el paralelo (D217). */
export async function membresiasDelCarril(
  db: Db,
  personaId: string,
  enParalelo: boolean,
  excluirId?: string,
): Promise<MembresiaActual[]> {
  const filas = await db.postulacion.findMany({
    where: {
      personaId,
      estado: 'aprobada',
      enParalelo,
      ...(excluirId ? { id: { not: excluirId } } : {}),
    },
    orderBy: [{ revisadaEn: 'asc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      ministerio: { select: { id: true, nombre: true } },
      celula: { select: { id: true, nombre: true } },
    },
  });
  return filas.map((f) => ({
    postulacionId: f.id,
    ministerio: f.ministerio,
    celula: f.celula,
  }));
}

/**
 * D241: decide qué hacer con las membresías actuales antes de sumar una nueva
 * a `ministerioId`. Se llama con la Persona YA bloqueada (`bloquearPersona`):
 * ese candado es la garantía del máximo de 2 (un índice parcial no cuenta
 * hasta 2). Devuelve la membresía a reemplazar, o null si se suma.
 *
 * - Ya sirve en ese Ministerio → 409 `YA_ES_MIEMBRO_DEL_MINISTERIO`.
 * - Carril vacío → se suma.
 * - `reemplazaId` → tiene que ser una de las actuales del carril.
 * - `confirmarCambio` con UNA sola actual → la reemplaza (D173, compatibilidad).
 * - `sumar` con lugar → se suma.
 * - Si no → 409 `POSTULACION_REQUIERE_CONFIRMAR_CAMBIO` con las actuales y si se puede sumar.
 */
export async function decidirMembresia(
  db: Db,
  args: {
    personaId: string;
    ministerioId: string;
    enParalelo: boolean;
    decision: DecisionMembresia;
    /** La Postulación que se está aprobando (no cuenta entre las actuales). */
    excluirId?: string;
  },
): Promise<MembresiaActual | null> {
  const mismoMinisterio = await db.postulacion.findFirst({
    where: {
      personaId: args.personaId,
      ministerioId: args.ministerioId,
      estado: 'aprobada',
      ...(args.excluirId ? { id: { not: args.excluirId } } : {}),
    },
    select: { id: true },
  });
  if (mismoMinisterio) {
    throw new AppException(
      'YA_ES_MIEMBRO_DEL_MINISTERIO',
      409,
      'Esta persona ya sirve en este Ministerio.',
    );
  }
  const actuales = await membresiasDelCarril(
    db,
    args.personaId,
    args.enParalelo,
    args.excluirId,
  );
  const decision = decisionAlAprobar(actuales.length, args.enParalelo);
  if (decision.tipo === 'directa') return null;

  const { sumar, reemplazaId, confirmarCambio } = args.decision;
  if (reemplazaId) {
    const elegida = actuales.find((a) => a.postulacionId === reemplazaId);
    if (!elegida) {
      throw new AppException(
        'VALIDACION',
        400,
        'La membresía a reemplazar no es una de las actuales de esta persona.',
        [{ campo: 'reemplazaId', code: 'REEMPLAZO_INVALIDO' }],
      );
    }
    return elegida;
  }
  if (confirmarCambio === true && actuales.length === 1) return actuales[0];
  if (sumar === true && decision.puedeSumar) return null;

  const detalle: DetalleDecisionMembresia = {
    ministerioActual: actuales[0].ministerio,
    ministeriosActuales: actuales,
    puedeSumar: decision.puedeSumar,
  };
  throw new AppException(
    'POSTULACION_REQUIERE_CONFIRMAR_CAMBIO',
    409,
    decision.puedeSumar
      ? `Esta persona ya sirve en ${actuales.map((a) => a.ministerio.nombre).join(' y ')}: elegí si lo suma o reemplaza uno.`
      : `Esta persona ya sirve en ${actuales.map((a) => a.ministerio.nombre).join(' y ')}: elegí cuál reemplaza.`,
    undefined,
    detalle as unknown as Record<string, unknown>,
  );
}

/** D241: la membresía reemplazada pasa a `inactiva` por cambio de Ministerio, apuntando a la nueva. */
export async function inactivarPorCambio(
  db: Db,
  anteriorId: string,
  nuevaId: string,
  autorId: string,
  ahora: Date,
): Promise<void> {
  await db.postulacion.update({
    where: { id: anteriorId },
    data: {
      estado: 'inactiva',
      motivoInactivacion: 'cambio_de_ministerio',
      inactivadaEn: ahora,
      inactivadaPorId: autorId,
      reemplazadaPorId: nuevaId,
    },
  });
}
