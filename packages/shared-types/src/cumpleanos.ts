import type { PersonaBreve } from './discipulado.js';

/**
 * spec 013 — cumpleaños (D62, D210, FR-030–FR-033). "Hoy" es siempre la
 * fecha civil de Argentina (`hoyEnArgentina`, la única implementación); acá
 * solo hay aritmética de fechas civiles `YYYY-MM-DD`, sin husos.
 */
export const CUMPLEANOS_DIAS_SEMANA = 7;
export const CUMPLEANOS_PAGINA = 50;

/** Una Persona en el listado de cumpleaños (`contracts/inicio-api.md`). */
export interface Cumpleanero {
  persona: PersonaBreve;
  /** `YYYY-MM-DD` del festejo en el año de referencia (29/2 → 28/2 si no es bisiesto). */
  fecha: string;
  dia: number;
  /** Los años que cumple (o cumplió) ese día. */
  cumple: number;
  /** El festejo ya pasó este año ("cumplió N"). */
  yaPaso: boolean;
  esHoy: boolean;
  telefono: string;
}

/** `GET /inicio/cumpleanos-semana`. */
export interface CumpleanosSemana {
  items: Cumpleanero[];
  hayMas: boolean;
}

export function esBisiesto(anio: number): boolean {
  return (anio % 4 === 0 && anio % 100 !== 0) || anio % 400 === 0;
}

const dos = (n: number) => String(n).padStart(2, '0');

/** El día en que se festeja en `anio` (FR-032: el 29/2 cae el 28/2 si `anio` no es bisiesto). */
export function festejoEnAnio(fechaNacimiento: string, anio: number): string {
  const [, mes, dia] = fechaNacimiento.slice(0, 10).split('-').map(Number);
  const diaReal = mes === 2 && dia === 29 && !esBisiesto(anio) ? 28 : dia;
  return `${anio}-${dos(mes)}-${dos(diaReal)}`;
}

function fila(fechaNacimiento: string, anio: number, hoy: string) {
  const fecha = festejoEnAnio(fechaNacimiento, anio);
  return {
    fecha,
    dia: Number(fecha.slice(8, 10)),
    cumple: anio - Number(fechaNacimiento.slice(0, 4)),
    yaPaso: fecha < hoy,
    esHoy: fecha === hoy,
  };
}

/** El festejo en el año de `hoy` — para el listado de un mes (H4.4: "cumplió N" si ya pasó). */
export function cumpleanosEsteAnio(fechaNacimiento: string, hoy: string) {
  return fila(fechaNacimiento, Number(hoy.slice(0, 4)), hoy);
}

/** El próximo festejo desde `hoy` inclusive — para "esta semana" (cruza el 31/12 al año siguiente). */
export function proximoCumpleanos(fechaNacimiento: string, hoy: string) {
  const anio = Number(hoy.slice(0, 4));
  const esteAnio = fila(fechaNacimiento, anio, hoy);
  return esteAnio.fecha >= hoy ? esteAnio : fila(fechaNacimiento, anio + 1, hoy);
}

/** `hoy` + `dias` como fecha civil `YYYY-MM-DD`. */
export function sumarDias(fecha: string, dias: number): string {
  const d = new Date(`${fecha.slice(0, 10)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}
