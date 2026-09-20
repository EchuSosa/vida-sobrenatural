/**
 * H-30 (revisión manual, actualización 2026-09-20): formato acotado de
 * `horarios` — uno o más grupos "Día HH[:MM] hs", separados por ", " o
 * " y " (ej. "Domingos 10:30 hs", "Domingos 10 hs y Martes 19:30 hs").
 * Deliberadamente rechaza formas ambiguas como "Domingos 10 y 18 hs" (dos
 * horarios sin repetir el día) — cada horario nombra su propio día.
 */
const GRUPO_HORARIO = '[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+ \\d{1,2}(?::\\d{2})? hs\\.?';
export const HORARIOS_SEDE_REGEX = new RegExp(`^${GRUPO_HORARIO}(?: y ${GRUPO_HORARIO}|, ${GRUPO_HORARIO})*$`);

/** Forma expuesta por GET /sedes, GET /sedes/:id, POST /sedes, PATCH /sedes/:id. */
export interface Sede {
  id: string;
  nombre: string;
  direccion: string;
  contactoTelefono: string | null;
  contactoEmail: string | null;
  horarios: string;
  descripcionBienvenida: string | null;
}

/** Body de POST /sedes. */
export interface CrearSedeInput {
  nombre: string;
  direccion: string;
  contactoTelefono?: string;
  contactoEmail?: string;
  horarios: string;
  descripcionBienvenida?: string;
}

/** Body de PATCH /sedes/:id — cualquier subconjunto, más el toggle de soft delete. */
export type ActualizarSedeInput = Partial<CrearSedeInput> & { activo?: boolean };
