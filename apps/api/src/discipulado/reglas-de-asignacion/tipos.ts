import type { Franja, NombreRegla } from '@vida-sobrenatural/shared-types';

/**
 * specs/004, D138: una regla de asignación responde si un par
 * (Solicitud, Discipulador) cumple o no. Firma común y pura — sin base, sin
 * estado — para que sumar una regla sea un archivo, una línea en `reglas.ts` y
 * su test, sin tocar pantallas ni contratos.
 */
export interface ParDeAsignacion {
  solicitud: { franjas: Franja[]; genero: string };
  discipulador: { franjas: Franja[]; genero: string };
}

export interface Regla {
  nombre: NombreRegla;
  cumple: (par: ParDeAsignacion) => boolean;
}
