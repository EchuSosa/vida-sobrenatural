import {
  ApiError,
  erroresPorCampo,
  type Franja,
} from '@vida-sobrenatural/shared-types';
import { minutosAHHMM } from '@vida-sobrenatural/ui';

/**
 * specs/004, lote B: piezas que comparten las pantallas del discipulado
 * (`/mis-discipulados` y `/grupos`, las dos del lote). Sin `'use client'`: las
 * importan tanto los Server Components como las islas de cliente.
 */

export type { DetalleDiscipuladoAdmin, DetalleMiDiscipulado, MisDiscipuladosRespuesta } from '@vida-sobrenatural/shared-types';

type Traductor = ((clave: string) => string) & { has: (clave: string) => boolean };

/**
 * El mensaje de un error de la API en el namespace de la pantalla
 * (`errores.<CODE>`), o el genérico. Los códigos de estas pantallas se
 * explican en contexto ("el Admin la retiró"), no con el texto general.
 */
export function mensajeDeError(e: unknown, t: Traductor): string {
  if (e instanceof ApiError && t.has(`errores.${e.code}`)) return t(`errores.${e.code}`);
  return t('errores.generico');
}

/** Los errores de campo de la API (H-50), traducidos con `campos.<CODE>` del namespace. */
export function mensajesDeCampo(e: unknown, t: Traductor): Record<string, string> | null {
  const campos = erroresPorCampo(e);
  if (!campos) return null;
  return Object.fromEntries(
    campos.map(({ campo, code }) => [campo, t.has(`campos.${code}`) ? t(`campos.${code}`) : t('errores.generico')]),
  );
}

export function nombresDe(personas: Array<{ nombre: string; apellido: string }>): string {
  return personas.map((p) => `${p.nombre} ${p.apellido}`).join(', ');
}

/** "Martes 19:00 a 21:00", con los días de `franjas.dias` (next-intl). */
export function textoFranja(f: Franja, dias: string[]): string {
  return `${dias[f.diaSemana]} ${minutosAHHMM(f.inicio)} a ${minutosAHHMM(f.fin)}`;
}
