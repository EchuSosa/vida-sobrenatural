/**
 * Catálogo de códigos de error compartido por las tres apps — ver
 * specs/002-base-transversal/contracts/errores.md y data-model.md. Cada
 * feature nueva agrega sus propios valores acá; nunca reinterpreta uno
 * existente (Constitución, Principio X).
 */
export type ErrorCode =
  | 'NO_AUTENTICADO'
  | 'SIN_PERMISO'
  | 'NO_ENCONTRADO'
  | 'VALIDACION'
  | 'EMAIL_DUPLICADO'
  | 'SEDE_INVALIDA'
  | 'SEDE_NOMBRE_DUPLICADO'
  | 'CONTACTO_SEDE_REQUERIDO'
  | 'CONSENTIMIENTO_REQUERIDO'
  | 'PERSONA_NO_PENDIENTE_TUTOR'
  | 'VERIFICACION_LOGIN_FALLIDA'
  | 'ERROR_INTERNO';

/** Forma de la respuesta de error de apps/api — Problem Details (RFC 9457). */
export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  code: ErrorCode;
  detail: string;
  requestId: string;
  errors?: Array<{ campo: string; code: string }>;
}
