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
