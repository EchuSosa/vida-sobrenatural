/**
 * spec 013 — perfil de Persona del backoffice (D209). Lo completa la sesión de
 * la 013 (T004: `PerfilPersona`, `relacionDesde`, `INVERSO_RELACION` movido
 * desde la API). Acá queda lo que ya usan otras specs.
 */

/** Iniciales para el avatar cuando no hay foto (D87): "José Pérez" → "JP". */
export function iniciales(nombre: string, apellido: string): string {
  const primera = (s: string) => s.trim().charAt(0).toLocaleUpperCase('es');
  return `${primera(nombre)}${primera(apellido)}`;
}
