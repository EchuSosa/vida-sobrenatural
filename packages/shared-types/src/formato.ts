/**
 * H-68 (revisión manual ronda 6, D84): fechas, horas y moneda se formatean
 * con `Intl` según el idioma activo — nunca crudas (ISO tal cual viene de
 * la API) ni a mano con `getDate()`/concatenación. No existía ni un solo
 * uso de `Intl.DateTimeFormat` en todo el repositorio; esta pieza es la
 * única fuente de verdad (Principio XI) para las tres apps.
 *
 * `locale` es un parámetro explícito, no se resuelve acá — esto se queda
 * puro y testeable sin depender de next-intl (que ni siquiera existe del
 * lado de `apps/api`, también consumidor de `packages/shared-types`). Cada
 * superficie de UI lo obtiene de next-intl (`useLocale()` en cliente,
 * `getLocale()` en servidor) y lo pasa.
 */

function comoFecha(fecha: string | Date): Date {
  return typeof fecha === 'string' ? new Date(fecha) : fecha;
}

/**
 * D84 dejó un solo locale activo, "es" a secas, sin región — pero la
 * audiencia real es Argentina (moneda ARS, teléfonos +54, docs/04). "es" a
 * secas le pone a `Intl.NumberFormat` el código de moneda como sufijo
 * ("1.500 ARS") en vez del símbolo que se usa acá ("$ 1.500,00"); se afina
 * a "es-AR" cuando no venga ya una región propia, para las dos familias de
 * formateo (fechas y moneda).
 */
function conRegion(locale: string): string {
  return locale === 'es' ? 'es-AR' : locale;
}

/**
 * "fecha corta"/"fecha larga" son para valores de solo-fecha (nacimiento,
 * fecha de un trámite) — la API los guarda como medianoche UTC
 * ("2012-03-10T00:00:00.000Z"). Formatearlos en el huso horario de quien
 * mira la pantalla correría el día hacia atrás en cualquier huso más
 * atrasado que UTC (Argentina, UTC-3, siempre): `timeZone: 'UTC'` fuerza a
 * leer el día/mes/año tal como están guardados, no el que caiga según dónde
 * esté el navegador. "fecha y hora" es lo opuesto — un instante real (por
 * ejemplo un Evento), donde sí corresponde mostrar la hora local de quien
 * mira.
 */
const OPCIONES_SOLO_FECHA = { timeZone: 'UTC' } as const;

/** "10/03/2012" */
export function formatearFechaCorta(fecha: string | Date, locale: string): string {
  return new Intl.DateTimeFormat(conRegion(locale), {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...OPCIONES_SOLO_FECHA,
  }).format(comoFecha(fecha));
}

/** "10 de marzo de 2012" */
export function formatearFechaLarga(fecha: string | Date, locale: string): string {
  return new Intl.DateTimeFormat(conRegion(locale), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...OPCIONES_SOLO_FECHA,
  }).format(comoFecha(fecha));
}

/**
 * El día civil (`YYYY-MM-DD`) de un INSTANTE en Argentina. Un instante como
 * `2026-09-28T01:30:00Z` es el 27 a las 22:30 en Buenos Aires: leerlo en UTC
 * (como hace `formatearFechaLarga`, que es para fechas civiles) mostraría el
 * día siguiente para todo lo que pasa después de las 21 h. Única
 * implementación (Principio XI): `hoyEnArgentina` (disponibilidad.ts) es esto
 * mismo aplicado a "ahora".
 */
export function diaCivilEnArgentina(instante: string | Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(comoFecha(instante));
}

/**
 * "28 de septiembre de 2026" para leer en pantalla, venga lo que venga: una
 * fecha civil (`2026-09-28`, un Encuentro o un período) tal cual, o un
 * instante (un pedido, una propuesta, una baja) como el día en que pasó en
 * Argentina. Es la que usan las pantallas de la 004.
 */
export function formatearDiaEnArgentina(valor: string | Date, locale: string): string {
  const civil = typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor) ? valor : diaCivilEnArgentina(valor);
  return formatearFechaLarga(civil, locale);
}

/** "10 de marzo de 2012, 14:30" */
export function formatearFechaHora(fecha: string | Date, locale: string): string {
  return new Intl.DateTimeFormat(conRegion(locale), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(comoFecha(fecha));
}

/** "$ 1.500" (ARS por default — la moneda con la que trabaja la iglesia). */
export function formatearMoneda(monto: number, locale: string, moneda = 'ARS'): string {
  return new Intl.NumberFormat(conRegion(locale), { style: 'currency', currency: moneda }).format(monto);
}
