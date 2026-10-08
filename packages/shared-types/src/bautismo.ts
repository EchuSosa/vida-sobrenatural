/**
 * spec 010 — Bautismo. Lote 0 global: estados y límites. `EstadoCardBautismo`,
 * `HechosBautismo`, `estadoCardBautismo()`, `motivoNoPuedePedir()` y los DTOs
 * los agrega la sesión de la 010 en este archivo (T002).
 */

/** `aprobada` se lee "aceptada" en pantalla (D147); `realizada`, D180. */
export type EstadoSolicitudBautismo = 'pendiente' | 'aprobada' | 'rechazada' | 'retirada' | 'realizada';

export const COMENTARIO_BAUTISMO_MAX = 500;
export const MOTIVO_RECHAZO_BAUTISMO_MAX = 500;
/** D184: constante propia, no la de Vida Nueva (H-128). */
export const EDAD_MINIMA_PEDIR_BAUTISMO_SOLO = 12;
