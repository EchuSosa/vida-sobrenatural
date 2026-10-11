import {
  EDAD_MINIMA_ROL_DE_CARGO,
  decisionAlAprobar,
  type DecisionMembresia,
  type DetalleDecisionMembresia,
  type MembresiaActual,
} from '@vida-sobrenatural/shared-types';
import type { Prisma } from '../generated/prisma/client.js';
import { AppException } from '../common/errors/app-exception.js';
import { calcularEdad } from '../persona/calcular-edad.js';
import { registrarCambioDeRol } from '../cambio-de-rol/registrar-cambio-de-rol.js';
import { bloquearPersona } from '../camino/consultas.js';
import type { NotificacionesService } from '../notificaciones/notificaciones.service.js';

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

/**
 * docs/22 + spec 005 (FR-011, FR-022): el rol `discipulador` al aprobar
 * "Discipulados Vida Nueva". Misma garantía de edad que `RolesService.otorgarRol`
 * (H-128) y mismo UPDATE atómico e idempotente; registra el cambio en la misma
 * transacción. La fila de la Persona ya está bloqueada.
 */
export async function otorgarDiscipulador(
  tx: Prisma.TransactionClient,
  personaId: string,
  autorId: string,
): Promise<void> {
  const persona = await tx.persona.findUniqueOrThrow({
    where: { id: personaId },
    select: { fechaNacimiento: true },
  });
  if (calcularEdad(persona.fechaNacimiento) < EDAD_MINIMA_ROL_DE_CARGO) {
    throw new AppException(
      'PERSONA_MENOR_DE_EDAD_NO_PUEDE_TENER_ROL_DE_CARGO',
      409,
      `Una Persona menor de ${EDAD_MINIMA_ROL_DE_CARGO} años no puede tener un rol de cargo.`,
    );
  }
  const cambiada = await tx.$queryRaw<{ id: string }[]>`
    UPDATE "personas" SET "rol" = array_append("rol", 'discipulador'::text), "updatedAt" = NOW()
    WHERE "id" = ${personaId} AND NOT ('discipulador'::text = ANY("rol"))
    RETURNING "id"`;
  if (cambiada.length > 0) {
    await registrarCambioDeRol(tx, {
      personaId,
      rol: 'discipulador',
      accion: 'otorgado',
      actor: { origen: 'backoffice', realizadoPorId: autorId },
    });
  }
}

/**
 * spec 015 (D242, D243): una membresía nueva SIN Postulación pendiente previa —
 * la confirmación de una elección de ministerio, de un "Ya sirvo" o la carga
 * directa del Admin. Crea la Postulación `aprobada` (la membresía, D170) con
 * los mismos efectos que aprobar una pendiente: la decisión de sumar o
 * reemplazar (D241), el rol de estado, el rol `discipulador` si se pide y el
 * aviso a la persona. Bloquea la Persona (el candado del máximo de 2).
 */
export async function crearMembresiaDirecta(
  tx: Db,
  deps: {
    rolesDeEstado: { otorgarRolDeEstado(personaId: string, rol: 'miembro_ministerio', db: Db): Promise<void> };
    notificaciones: NotificacionesService;
  },
  args: {
    personaId: string;
    ministerioId: string;
    celulaId: string | null;
    autorId: string;
    decision: DecisionMembresia;
    otorgarRolDiscipulador?: boolean;
    motivacion?: string | null;
  },
): Promise<{ postulacionId: string; reemplazaA: string | null }> {
  await bloquearPersona(tx, args.personaId);
  const [ministerio, celula] = await Promise.all([
    tx.ministerio.findUnique({
      where: { id: args.ministerioId },
      select: { nombre: true, activo: true, eliminadoEn: true, requiereFormacion: true },
    }),
    args.celulaId
      ? tx.celula.findUnique({
          where: { id: args.celulaId },
          select: { ministerioId: true, activo: true, eliminadoEn: true, ofreceRolDiscipulador: true },
        })
      : Promise.resolve(null),
  ]);
  if (!ministerio || !ministerio.activo || ministerio.eliminadoEn) {
    throw new AppException('MINISTERIO_NO_DISPONIBLE', 409, 'Este Ministerio no está disponible: reactivalo antes de confirmar.');
  }
  if (args.celulaId && (!celula || celula.ministerioId !== args.ministerioId || !celula.activo || celula.eliminadoEn)) {
    throw new AppException('VALIDACION', 400, 'El área no está disponible: reactivala antes de confirmar.', [
      { campo: 'celulaId', code: 'CELULA_NO_DISPONIBLE' },
    ]);
  }
  if (args.otorgarRolDiscipulador && !celula?.ofreceRolDiscipulador) {
    throw new AppException('VALIDACION', 400, 'Esta área no ofrece el rol de Discipulador.', [
      { campo: 'otorgarRolDiscipulador', code: 'OTORGARROLDISCIPULADOR_INVALIDO' },
    ]);
  }
  const enParalelo = celula?.ofreceRolDiscipulador ?? false;
  const anterior = await decidirMembresia(tx, {
    personaId: args.personaId,
    ministerioId: args.ministerioId,
    enParalelo,
    decision: args.decision,
  });
  const ahora = new Date();
  const creada = await tx.postulacion.create({
    data: {
      personaId: args.personaId,
      ministerioId: args.ministerioId,
      celulaId: args.celulaId,
      estado: 'aprobada',
      motivacion: args.motivacion ?? null,
      creadoPorId: args.autorId,
      revisadoPorId: args.autorId,
      revisadaEn: ahora,
      requiereFormacion: ministerio.requiereFormacion,
      enParalelo,
    },
    select: { id: true },
  });
  if (anterior) await inactivarPorCambio(tx, anterior.postulacionId, creada.id, args.autorId, ahora);
  await deps.rolesDeEstado.otorgarRolDeEstado(args.personaId, 'miembro_ministerio', tx);
  if (args.otorgarRolDiscipulador) await otorgarDiscipulador(tx, args.personaId, args.autorId);
  await deps.notificaciones.emitir(tx, {
    nombre: 'ministerio.postulacion_aprobada',
    a: { tipo: 'persona', personaId: args.personaId },
    datos: {
      postulacionId: creada.id,
      ministerioId: args.ministerioId,
      ministerio: ministerio.nombre,
      celulaId: args.celulaId,
      reemplazaA: anterior?.postulacionId ?? null,
    },
  });
  return { postulacionId: creada.id, reemplazaA: anterior?.postulacionId ?? null };
}
