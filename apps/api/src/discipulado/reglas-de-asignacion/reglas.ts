import type { NombreRegla } from '@vida-sobrenatural/shared-types';
import type { ParDeAsignacion, Regla } from './tipos.js';
import { reglaHorario } from './horario.js';
import { reglaGenero } from './genero.js';

/**
 * specs/004, D138: la lista de reglas de asignación, en un solo lugar. Sumar
 * una tercera es agregar un archivo y una línea acá (y su valor en
 * `NombreRegla`, shared-types) — nada más toca. El sistema **sugiere** con
 * ellas; el Admin siempre decide (D25), y los que no cumplen se muestran igual
 * con la razón, no se ocultan.
 */
export const REGLAS: readonly Regla[] = [reglaHorario, reglaGenero];

export interface Evaluacion {
  cumpleTodas: boolean;
  incumple: NombreRegla[];
}

/** Evalúa un par contra todas las reglas y devuelve cuáles no cumple (en orden). */
export function evaluar(par: ParDeAsignacion): Evaluacion {
  const incumple = REGLAS.filter((r) => !r.cumple(par)).map((r) => r.nombre);
  return { cumpleTodas: incumple.length === 0, incumple };
}

export type { ParDeAsignacion, Regla };
