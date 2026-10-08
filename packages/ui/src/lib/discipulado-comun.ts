import {
  ApiError,
  erroresPorCampo,
  type Franja,
} from '@vida-sobrenatural/shared-types';
import { minutosAHHMM } from '../components/editor-de-franjas';

/**
 * specs/004, lote B: piezas que comparten las pantallas del discipulado
 * (`/mis-discipulados` y `/grupos`, las dos del lote). Sin `'use client'`: las
 * importan tanto los Server Components como las islas de cliente.
 *
 * spec 006 (lote C): movidas a `packages/ui` porque Mis discipulados pasó a la
 * web app y Grupos sigue en el backoffice (Principio XI).
 */

export type Traductor = ((clave: string) => string) & { has: (clave: string) => boolean };

/**
 * El mensaje de un error de la API: el texto de su código en `errors` (una
 * sola fuente para todas las pantallas), o el genérico de la pantalla
 * (`errores.generico` de su namespace) si el código no tiene uno.
 */
export function mensajeDeError(e: unknown, te: Traductor, t: Traductor): string {
  if (e instanceof ApiError && te.has(e.code)) return te(e.code);
  return t('errores.generico');
}

/** Los errores de campo de la API (H-50), traducidos con `errors.campos.<CODE>`. */
export function mensajesDeCampo(e: unknown, te: Traductor, t: Traductor): Record<string, string> | null {
  const campos = erroresPorCampo(e);
  if (!campos) return null;
  return Object.fromEntries(
    campos.map(({ campo, code }) => [campo, te.has(`campos.${code}`) ? te(`campos.${code}`) : t('errores.generico')]),
  );
}

export function nombresDe(personas: Array<{ nombre: string; apellido: string }>): string {
  return personas.map((p) => `${p.nombre} ${p.apellido}`).join(', ');
}

/** "Martes 19:00 a 21:00", con los días de `franjas.dias` (next-intl). */
export function textoFranja(f: Franja, dias: string[]): string {
  return `${dias[f.diaSemana]} ${minutosAHHMM(f.inicio)} a ${minutosAHHMM(f.fin)}`;
}
