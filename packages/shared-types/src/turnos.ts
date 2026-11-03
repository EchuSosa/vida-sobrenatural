import { hoyEnArgentina } from './disponibilidad.js';

/**
 * spec 017 (turnos de servicio). Lo configurable de la spec vive acá, en un solo lugar (pedido de
 * Echu del 2026-11-01: "dejala fácil de cambiar"). Ver la tabla del principio de
 * `specs/017-turnos-servicio/spec.md`.
 */

/** D251: cuánta gente necesita un área por fecha, si nadie lo cambió. */
export const CUPO_TURNO_POR_DEFECTO = 1;
/** D251: el cupo va de 1 a este número. */
export const CUPO_TURNO_MAXIMO = 20;
/** Cuántas fechas próximas muestra la grilla del líder. */
export const FECHAS_VISIBLES_TURNOS = 8;
/** D252: cuántas fechas anteriores cuenta "cuántas veces sirvió". */
export const FECHAS_PARA_CONTAR_TURNOS = 8;
/** D256: cuántos días antes llega el recordatorio. */
export const DIAS_RECORDATORIO_TURNO = 2;
/** D257: largo máximo del motivo de "No puedo ir". */
export const MOTIVO_CANCELACION_MAX = 200;

export type FrecuenciaDiaDeServicio = 'semanal' | 'mensual';

/**
 * D250: un día de servicio del Ministerio. `semanal`: todos los `diaSemana` (0 = domingo).
 * `mensual`: el `posicionEnMes`-ésimo `diaSemana` del mes (1 a 4), o el último (-1).
 */
export interface ReglaDiaDeServicio {
  frecuencia: FrecuenciaDiaDeServicio;
  diaSemana: number;
  posicionEnMes?: number | null;
}

export const POSICIONES_EN_MES: readonly number[] = [1, 2, 3, 4, -1];

export type ErrorReglaDiaDeServicio = 'DIA_SEMANA_INVALIDO' | 'FRECUENCIA_INVALIDA' | 'POSICION_EN_MES_INVALIDA';

/** Qué tiene mal una regla (vacío = está bien). Misma regla en el backoffice y en la API. */
export function erroresDeReglaDiaDeServicio(r: Partial<Record<keyof ReglaDiaDeServicio, unknown>>): ErrorReglaDiaDeServicio[] {
  const errores: ErrorReglaDiaDeServicio[] = [];
  if (r.frecuencia !== 'semanal' && r.frecuencia !== 'mensual') errores.push('FRECUENCIA_INVALIDA');
  if (!Number.isInteger(r.diaSemana) || (r.diaSemana as number) < 0 || (r.diaSemana as number) > 6) errores.push('DIA_SEMANA_INVALIDO');
  if (r.frecuencia === 'mensual' && !POSICIONES_EN_MES.includes(r.posicionEnMes as number)) errores.push('POSICION_EN_MES_INVALIDA');
  if (r.frecuencia === 'semanal' && r.posicionEnMes != null) errores.push('POSICION_EN_MES_INVALIDA');
  return errores;
}

/** D251: ¿es un cupo aceptable? Entero de 1 a `CUPO_TURNO_MAXIMO`. */
export function cupoTurnoValido(valor: unknown): valor is number {
  return Number.isInteger(valor) && (valor as number) >= 1 && (valor as number) <= CUPO_TURNO_MAXIMO;
}

const FECHA_CIVIL = /^(\d{4})-(\d{2})-(\d{2})$/;

function partes(dia: string): { anio: number; mes: number; d: number } {
  const m = FECHA_CIVIL.exec(dia);
  if (!m) throw new Error(`Fecha civil inválida: ${dia}`);
  return { anio: Number(m[1]), mes: Number(m[2]), d: Number(m[3]) };
}

function aTexto(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}

/** El día de la semana (0 = domingo) de una fecha civil `AAAA-MM-DD`, sin zona horaria de por medio. */
export function diaSemanaDe(dia: string): number {
  const { anio, mes, d } = partes(dia);
  return new Date(Date.UTC(anio, mes - 1, d)).getUTCDay();
}

/** ¿La fecha civil `dia` es un día de servicio según `regla`? */
export function cumpleRegla(dia: string, regla: ReglaDiaDeServicio): boolean {
  if (diaSemanaDe(dia) !== regla.diaSemana) return false;
  if (regla.frecuencia === 'semanal') return true;
  const { anio, mes, d } = partes(dia);
  if (regla.posicionEnMes === -1) {
    const diasDelMes = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
    return d + 7 > diasDelMes;
  }
  return Math.ceil(d / 7) === regla.posicionEnMes;
}

/**
 * D250: las próximas `cantidad` fechas de servicio (fechas civiles en Argentina, `AAAA-MM-DD`),
 * desde `desde` inclusive, que cumplen alguna de las reglas. Sin reglas, ninguna. Busca como mucho
 * un año y medio hacia adelante (una regla mensual da 12 por año).
 */
export function fechasDeServicio(reglas: readonly ReglaDiaDeServicio[], cantidad: number = FECHAS_VISIBLES_TURNOS, desde: string = hoyEnArgentina()): string[] {
  if (reglas.length === 0 || cantidad <= 0) return [];
  const { anio, mes, d } = partes(desde);
  const fechas: string[] = [];
  for (let i = 0; i < 550 && fechas.length < cantidad; i++) {
    const dia = aTexto(new Date(Date.UTC(anio, mes - 1, d + i)));
    if (reglas.some((r) => cumpleRegla(dia, r))) fechas.push(dia);
  }
  return fechas;
}

/** Estado de una fecha de servicio (D256): en borrador, publicada o suspendida ("este día no hay"). */
export type EstadoFechaDeServicio = 'borrador' | 'publicada' | 'suspendida';

/** Una regla cargada, como la devuelve la API. */
export interface DiaDeServicioVista extends ReglaDiaDeServicio {
  id: string;
}

/** Una próxima fecha de servicio del Ministerio, con su estado y cuántos turnos tiene asignados. */
export interface ProximaFechaDeServicio {
  dia: string;
  estado: EstadoFechaDeServicio;
  turnosAsignados: number;
}

/** GET /ministerios/:id/dias-de-servicio — US1 de la spec 017 (backoffice). */
export interface DiasDeServicioDelMinisterio {
  reglas: DiaDeServicioVista[];
  /** Cupo del Ministerio entero; solo cuenta si no tiene Células (D251). */
  cupoMinisterio: number;
  celulas: Array<{ id: string; nombre: string; cupoTurno: number }>;
  proximas: ProximaFechaDeServicio[];
}

/** "domingo 8 de noviembre" (la fecha civil, sin zona horaria). Una sola versión para las dos apps. */
export function formatearDiaDeServicio(dia: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === 'es' ? 'es-AR' : locale, { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(
    new Date(`${dia}T00:00:00.000Z`),
  );
}
