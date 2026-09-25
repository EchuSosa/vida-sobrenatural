/** Edad en años cumplidos a partir de una fecha de nacimiento, relativa a `ahora` (FR-007). */
export function calcularEdad(fechaNacimiento: Date, ahora: Date = new Date()): number {
  let edad = ahora.getUTCFullYear() - fechaNacimiento.getUTCFullYear();
  const todaviaNoCumpleEsteAnio =
    ahora.getUTCMonth() < fechaNacimiento.getUTCMonth() ||
    (ahora.getUTCMonth() === fechaNacimiento.getUTCMonth() &&
      ahora.getUTCDate() < fechaNacimiento.getUTCDate());
  if (todaviaNoCumpleEsteAnio) {
    edad -= 1;
  }
  return edad;
}

/**
 * La misma regla que `calcularEdad`, expresada como fecha para que Postgres
 * filtre sin traer filas de más (H-42): tiene al menos `edad` años cumplidos
 * a `ahora` quien nació ANTES de la fecha devuelta (límite exclusivo).
 *
 * El `Math.min` cubre el 29 de febrero: si hoy es 29/2 y el año de corte no
 * es bisiesto, `Date.UTC(anio, 1, 30)` saltaría al 2 de marzo e incluiría a
 * quien nació el 1 de marzo — que según `calcularEdad` todavía no cumplió.
 */
export function nacidosAntesDeParaEdad(edad: number, ahora: Date = new Date()): Date {
  const anio = ahora.getUTCFullYear() - edad;
  const mes = ahora.getUTCMonth();
  return new Date(Math.min(Date.UTC(anio, mes, ahora.getUTCDate() + 1), Date.UTC(anio, mes + 1, 1)));
}
