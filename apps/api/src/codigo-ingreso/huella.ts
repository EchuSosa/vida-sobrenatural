import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { CODIGO_INGRESO_LARGO } from '@vida-sobrenatural/shared-types';

/**
 * spec 007 (T012, research.md #3 y #4) — el código y las huellas.
 *
 * - El código es de 6 dígitos al azar con `crypto.randomInt` (no `Math.random`).
 * - En la base nunca se guarda en claro: se guarda su huella HMAC-SHA256 con
 *   `CODIGO_INGRESO_SECRET`. Lo mismo con el origen (la IP): nunca en claro.
 * - La comparación es de tiempo constante (`timingSafeEqual`).
 */

/** `azar` solo se reemplaza en los tests (para probar el relleno con ceros). */
export function generarCodigo(azar: (maximo: number) => number = (maximo) => randomInt(0, maximo)): string {
  return String(azar(10 ** CODIGO_INGRESO_LARGO)).padStart(CODIGO_INGRESO_LARGO, '0');
}

function secreto(): string {
  const valor = process.env.CODIGO_INGRESO_SECRET;
  if (!valor) {
    throw new Error('Falta CODIGO_INGRESO_SECRET: sin él no se pueden guardar códigos de ingreso (spec 007).');
  }
  return valor;
}

export function huella(valor: string, clave: string = secreto()): string {
  return createHmac('sha256', clave).update(valor).digest('hex');
}

export function coincide(valor: string, huellaGuardada: string, clave: string = secreto()): boolean {
  const a = Buffer.from(huella(valor, clave), 'hex');
  const b = Buffer.from(huellaGuardada, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * La persona puede copiar el código con espacios o guiones ("482 913",
 * "482-913"): se quitan antes de validar. Devuelve `null` si después no quedan
 * exactamente 6 dígitos.
 */
export function limpiarCodigo(entrada: unknown): string | null {
  if (typeof entrada !== 'string') return null;
  const limpio = entrada.replace(/[\s-]/g, '');
  return new RegExp(`^\\d{${CODIGO_INGRESO_LARGO}}$`).test(limpio) ? limpio : null;
}
