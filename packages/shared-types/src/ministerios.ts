/**
 * spec 009 — Ministerios y Células. Lote 0 global: estados, límites y la regla
 * de aptitud (la leen 006 y 009). Los DTOs (`MinisterioPublico`,
 * `PostulacionDetalle`, `EstadoMiMinisterio`, …) los agrega la sesión de la
 * 009 en este archivo (T002).
 */

export type EstadoPostulacion = 'pendiente' | 'aprobada' | 'rechazada' | 'inactiva' | 'retirada';
export type MotivoInactivacionPostulacion = 'cambio_de_ministerio' | 'baja';

export const MINISTERIO_NOMBRE_MAX = 80;
export const MINISTERIO_DESCRIPCION_MAX = 600;
export const CELULA_NOMBRE_MAX = 80;
export const POSTULACION_TEXTO_MAX = 500;

/**
 * D159, D169: Apto para Ministerio es el rol de estado `apto_ministerio`, que
 * escribe el sistema (al completar Vida de Servicio o con Completitud Manual
 * de Vida de Servicio, D160). Nunca se activa a mano.
 */
export function esAptaParaMinisterio(roles: readonly string[]): boolean {
  return roles.includes('apto_ministerio');
}
