/**
 * spec 007 — Ingreso con código por email (D141). Valores compartidos por la
 * API (genera y limita), `packages/ui` (campo del código) y las dos apps
 * (duración de la sesión). Ver specs/007-ingreso-codigo-email/data-model.md.
 */

/**
 * Forma única de un email en toda la app (FR-010): sin espacios al principio
 * ni al final y en minúsculas. La usan todo alta, edición y búsqueda de
 * Persona por email, y el pedido de código. La migración lote_0_global ya
 * normalizó los existentes.
 */
export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

export const CODIGO_INGRESO_LARGO = 6;
/** FR-004 */
export const CODIGO_INGRESO_VIDA_MIN = 15;
/** FR-006 */
export const CODIGO_INGRESO_MAX_INTENTOS = 5;
export const CODIGO_INGRESO_ENVIOS_POR_EMAIL_HORA = 5;
export const CODIGO_INGRESO_ENVIOS_POR_ORIGEN_HORA = 30;
export const DURACION_SESION_WEB_S = 30 * 24 * 60 * 60;
export const DURACION_SESION_BACKOFFICE_S = 7 * 24 * 60 * 60;
