/**
 * spec 013 — "Contanos qué te parece" (D102, D211). Lote 0 global: valores y
 * límites. Los DTOs y `resumirNavegador()` los agrega la sesión de la 013 en
 * este archivo (T008, T017).
 */
export type TipoComentario = 'problema' | 'sugerencia';
export type AppOrigen = 'web' | 'backoffice';

export const COMENTARIO_TEXTO_MAX = 2000;
export const COMENTARIOS_POR_HORA_SIN_SESION = 5;
export const COMENTARIOS_POR_HORA_CON_SESION = 20;
