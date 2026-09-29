import {
  MAX_PERSONAS_POR_GRUPO_VIDA_NUEVA,
  bloqueoVigente,
  type BloqueoDisponibilidad,
  type Franja,
  type PorQueNoAparece,
} from '@vida-sobrenatural/shared-types';
import type { AppExceptionErrorField } from '../common/errors/app-exception.js';

/**
 * specs/004, Historia 4 (T037/T038): las reglas de la disponibilidad sin base
 * de datos, para probarlas solas. El service carga, llama acá y guarda.
 * Los códigos de campo van bajo `VALIDACION` (contracts/disponibilidad-api.md).
 */

/** Minutos: `inicio` 0..1439, `fin` 1..1440, `diaSemana` 0..6, `fin > inicio` (FR-017). */
export function validarFranja(franja: Franja): AppExceptionErrorField[] {
  const errores: AppExceptionErrorField[] = [];
  if (!Number.isInteger(franja.diaSemana) || franja.diaSemana < 0 || franja.diaSemana > 6) {
    errores.push({ campo: 'diaSemana', code: 'DIA_SEMANA_INVALIDO' });
  }
  const inicioValido = Number.isInteger(franja.inicio) && franja.inicio >= 0 && franja.inicio <= 1439;
  const finValido = Number.isInteger(franja.fin) && franja.fin >= 1 && franja.fin <= 1440;
  if (!inicioValido) errores.push({ campo: 'inicio', code: 'INICIO_INVALIDO' });
  if (!finValido) {
    errores.push({ campo: 'fin', code: 'FIN_INVALIDO' });
  } else if (inicioValido && franja.fin <= franja.inicio) {
    errores.push({ campo: 'fin', code: 'FRANJA_FIN_ANTERIOR_AL_INICIO' });
  }
  return errores;
}

/**
 * Fechas civiles `YYYY-MM-DD` (ya validadas de formato por el DTO). `hasta >=
 * desde` y `hasta >= hoy`: un período que ya terminó no tiene efecto (FR-016).
 * Si `hasta < desde`, ese es el error que se muestra (es el que la persona
 * tiene que corregir primero).
 */
export function validarBloqueo(bloqueo: { desde: string; hasta: string }, hoy: string): AppExceptionErrorField[] {
  if (bloqueo.hasta < bloqueo.desde) return [{ campo: 'hasta', code: 'BLOQUEO_FIN_ANTERIOR_AL_INICIO' }];
  if (bloqueo.hasta < hoy) return [{ campo: 'hasta', code: 'BLOQUEO_YA_VENCIDO' }];
  return [];
}

/** 1..`MAX_PERSONAS_POR_GRUPO_VIDA_NUEVA`, entero (FR-045). */
export function validarMaximoPorGrupo(maximo: number): AppExceptionErrorField[] {
  if (!Number.isInteger(maximo) || maximo < 1 || maximo > MAX_PERSONAS_POR_GRUPO_VIDA_NUEVA) {
    return [{ campo: 'maxPersonasPorGrupo', code: 'MAXIMO_POR_GRUPO_FUERA_DE_RANGO' }];
  }
  return [];
}

/**
 * FR-006 visto desde el Discipulador: aparece en el cruce si tiene agenda, el
 * toggle prendido y ningún período vigente. `porQueNo` es la PRIMERA razón,
 * en este orden: sin agenda, toggle apagado, bloqueo vigente.
 */
export function aparicionEnElCruce(estado: {
  cantidadFranjas: number;
  disponible: boolean;
  bloqueos: { desde: string; hasta: string }[];
  hoy: string;
}): { apareceEnElCruce: boolean; porQueNo: PorQueNoAparece } {
  let porQueNo: PorQueNoAparece = null;
  if (estado.cantidadFranjas === 0) porQueNo = 'sin_agenda';
  else if (!estado.disponible) porQueNo = 'toggle_apagado';
  else if (estado.bloqueos.some((b) => bloqueoVigente(b, estado.hoy))) porQueNo = 'bloqueo_vigente';
  return { apareceEnElCruce: porQueNo === null, porQueNo };
}

/** Los bloqueos que ve la pantalla: vivos y con `hasta >= hoy` (los vencidos no afectan nada), con `vigente`. */
export function bloqueosVisibles(bloqueos: { id: string; desde: string; hasta: string }[], hoy: string): BloqueoDisponibilidad[] {
  return bloqueos
    .filter((b) => b.hasta >= hoy)
    .sort((a, b) => a.desde.localeCompare(b.desde) || a.hasta.localeCompare(b.hasta))
    .map((b) => ({ ...b, vigente: bloqueoVigente(b, hoy) }));
}
