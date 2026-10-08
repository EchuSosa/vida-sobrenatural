import {
  POSTULACION_TEXTO_MAX,
  esAptaParaMinisterio,
} from '@vida-sobrenatural/shared-types';
import {
  AppException,
  type AppExceptionErrorField,
} from '../common/errors/app-exception.js';

/**
 * spec 009, T009 (data-model.md "Reglas al crear"): las reglas para crear una
 * Postulación, en este orden — el primer fallo gana. Pura (sin base): el
 * servicio junta el contexto dentro de su transacción y la llama; los tests
 * unitarios prueban cada rama y la precedencia (T010). La usan la Persona
 * (FR-001 a FR-007) y el Admin en nombre de ella (FR-024): mismas reglas.
 */
export interface ContextoNuevaPostulacion {
  persona: { activa: boolean; roles: readonly string[] };
  /** null = no existe o está eliminado. */
  ministerio: { id: string; activo: boolean } | null;
  /** Solo si se pidió una Célula; null = no existe o está eliminada. */
  celula?: { ministerioId: string; activo: boolean } | null;
  motivacion: string | null;
  disponibilidad: string | null;
  /** Ministerio de su Postulación `aprobada`, si tiene. */
  ministerioAprobadoId: string | null;
  tienePendiente: boolean;
}

export type FalloPostulacion =
  | { code: 'NO_APTA_PARA_MINISTERIO' }
  | { code: 'NO_ENCONTRADO' }
  | { code: 'MINISTERIO_NO_DISPONIBLE' }
  | { code: 'VALIDACION'; errors: AppExceptionErrorField[] }
  | { code: 'YA_ES_MIEMBRO_DEL_MINISTERIO' }
  | { code: 'POSTULACION_YA_PENDIENTE' };

export function validarNuevaPostulacion(
  c: ContextoNuevaPostulacion,
): FalloPostulacion | null {
  // 1. Persona activa y apta (FR-002): la aptitud es el rol de estado de la 008.
  if (!c.persona.activa || !esAptaParaMinisterio(c.persona.roles))
    return { code: 'NO_APTA_PARA_MINISTERIO' };
  // 2. Ministerio disponible.
  if (c.ministerio === null) return { code: 'NO_ENCONTRADO' };
  if (!c.ministerio.activo) return { code: 'MINISTERIO_NO_DISPONIBLE' };
  // 3 y 4. Campos (H-50): se juntan todos antes de responder.
  const errors: AppExceptionErrorField[] = [];
  if (c.celula !== undefined) {
    const celula = c.celula;
    if (
      celula === null ||
      celula.ministerioId !== c.ministerio.id ||
      !celula.activo
    ) {
      errors.push({ campo: 'celulaId', code: 'CELULA_NO_DISPONIBLE' });
    }
  }
  if ((c.motivacion?.length ?? 0) > POSTULACION_TEXTO_MAX)
    errors.push({ campo: 'motivacion', code: 'TEXTO_DEMASIADO_LARGO' });
  if ((c.disponibilidad?.length ?? 0) > POSTULACION_TEXTO_MAX)
    errors.push({ campo: 'disponibilidad', code: 'TEXTO_DEMASIADO_LARGO' });
  if (errors.length > 0) return { code: 'VALIDACION', errors };
  // 5. Ya es miembro de ESE Ministerio (FR-004).
  if (c.ministerioAprobadoId === c.ministerio.id)
    return { code: 'YA_ES_MIEMBRO_DEL_MINISTERIO' };
  // 6. Una sola pendiente a la vez, a cualquier Ministerio (FR-003, D60).
  if (c.tienePendiente) return { code: 'POSTULACION_YA_PENDIENTE' };
  return null;
}

const DETALLES: Record<
  Exclude<FalloPostulacion['code'], 'VALIDACION'>,
  { estado: number; detalle: string }
> = {
  NO_APTA_PARA_MINISTERIO: {
    estado: 409,
    detalle:
      'Para postularse a un Ministerio primero hay que terminar Vida de Servicio.',
  },
  NO_ENCONTRADO: { estado: 404, detalle: 'No existe ese Ministerio.' },
  MINISTERIO_NO_DISPONIBLE: {
    estado: 409,
    detalle: 'Ese Ministerio no está disponible ahora.',
  },
  YA_ES_MIEMBRO_DEL_MINISTERIO: {
    estado: 409,
    detalle: 'Ya sirve en este Ministerio.',
  },
  POSTULACION_YA_PENDIENTE: {
    estado: 409,
    detalle: 'Ya hay una postulación en revisión.',
  },
};

/** El rechazo HTTP de un fallo de `validarNuevaPostulacion`. */
export function excepcionDe(fallo: FalloPostulacion): AppException {
  if (fallo.code === 'VALIDACION')
    return new AppException(
      'VALIDACION',
      400,
      'Uno o más campos no son válidos.',
      fallo.errors,
    );
  const { estado, detalle } = DETALLES[fallo.code];
  return new AppException(fallo.code, estado, detalle);
}

/** Texto opcional del formulario: vacío o solo espacios = null (no se guarda un string vacío). */
export function textoOpcional(texto: string | null | undefined): string | null {
  const limpio = texto?.trim() ?? '';
  return limpio === '' ? null : limpio;
}
