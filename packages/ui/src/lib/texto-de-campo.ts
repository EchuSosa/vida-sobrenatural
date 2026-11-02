import type { Traductor } from './discipulado-comun';

/**
 * QA ronda 1, BUG-03: el texto de un error de campo de la API (H-50). Busca
 * primero `errors.campos.<CODE>` y, si no está ahí, `errors.<CODE>`: hay
 * códigos que la API manda por campo y que tienen su texto en `errors` (ej.
 * `DIRECCION_NO_UBICADA`), y antes caían en el genérico ("No pudimos
 * completar el pedido") en vez de decir cómo corregir. Si no hay ninguno, el
 * genérico de la pantalla. Una sola regla para web y backoffice (Principio XI).
 */
export function textoDeCampo(te: Traductor, code: string, generico: string): string {
  if (te.has(`campos.${code}`)) return te(`campos.${code}`);
  if (te.has(code)) return te(code);
  return generico;
}
