import type { Regla } from './tipos.js';

/**
 * FR-033: la Persona y el Discipulador tienen el mismo género (`Persona.genero`
 * ya existe y es obligatorio; no hay dato nuevo).
 */
export const reglaGenero: Regla = {
  nombre: 'genero',
  cumple: ({ solicitud, discipulador }) => solicitud.genero === discipulador.genero,
};
