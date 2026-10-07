import { franjasCoinciden } from '@vida-sobrenatural/shared-types';
import type { Regla } from './tipos.js';

/**
 * FR-033: coinciden si alguna franja de la Solicitud comparte con alguna de la
 * agenda del Discipulador el mismo día y al menos 60 minutos (franjasCoinciden,
 * shared-types — única implementación del umbral).
 */
export const reglaHorario: Regla = {
  nombre: 'horario',
  cumple: ({ solicitud, discipulador }) =>
    solicitud.franjas.some((fs) => discipulador.franjas.some((fa) => franjasCoinciden(fs, fa))),
};
