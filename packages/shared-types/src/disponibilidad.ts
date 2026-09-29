/**
 * specs/004-vida-nueva-discipulado — disponibilidad del Discipulador (Historia
 * 4): agenda semanal, toggle, períodos de no disponibilidad y máximo por
 * Grupo. Ver `contracts/disponibilidad-api.md`. La fecha "hoy" y la vigencia
 * de un bloqueo viven acá (Principio XI): las usan la API (el cruce) y el
 * backoffice (la pantalla).
 */
import type { Franja } from './discipulado.js';
import { diaCivilEnArgentina } from './formato.js';

export type { Franja };
export { MAX_PERSONAS_POR_GRUPO_VIDA_NUEVA, MINUTOS_MINIMOS_EN_COMUN } from './discipulado.js';

/** Una franja de la agenda del Discipulador (FR-031), con su id para poder borrarla. */
export type FranjaAgenda = Franja & { id: string };

export interface BloqueoDisponibilidad {
  id: string;
  /** Fecha civil `YYYY-MM-DD`. */
  desde: string;
  hasta: string;
  vigente: boolean;
}

/**
 * Por qué un Discipulador no aparece hoy en el cruce, en orden de prioridad
 * (FR-006). `null` = sí aparece. La pantalla lo traduce a palabras (FR-047).
 */
export type PorQueNoAparece = 'sin_agenda' | 'toggle_apagado' | 'bloqueo_vigente' | null;

export interface MiDisponibilidad {
  disponible: boolean;
  maxPersonasPorGrupo: number;
  franjas: FranjaAgenda[];
  bloqueos: BloqueoDisponibilidad[];
  apareceEnElCruce: boolean;
  porQueNo: PorQueNoAparece;
}

/**
 * La fecha civil de hoy en Argentina (`YYYY-MM-DD`), sin hora ni zona. Única
 * implementación (research #7): la usan el listado de disponibles de la API y
 * la pantalla de disponibilidad. Se apoya en `Intl` con la zona fija —
 * Argentina es siempre UTC-3, pero calcularla con la zona evita el corrimiento
 * de día si el proceso corre en otro huso (mismo criterio que `formato.ts`).
 */
export function hoyEnArgentina(ahora: Date = new Date()): string {
  return diaCivilEnArgentina(ahora);
}

/**
 * ¿El bloqueo cubre `hoy`? Los dos extremos inclusive (research #7). Compara
 * fechas civiles `YYYY-MM-DD`, que ordenan lexicográficamente igual que
 * cronológicamente — sin construir `Date` ni arrastrar husos.
 */
export function bloqueoVigente(bloqueo: { desde: string; hasta: string }, hoy: string = hoyEnArgentina()): boolean {
  return bloqueo.desde <= hoy && hoy <= bloqueo.hasta;
}
