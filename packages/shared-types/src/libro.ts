/**
 * H-93 (revisión manual ronda 9): `anio` y `orden` no tenían rango, ni en
 * la API ni en la UI — se podía cargar año 100 o orden 10000000. Los
 * límites viven acá (Principio XI, mismo criterio que `PORTADA_ASPECTO`)
 * para que `apps/api` (que los valida de verdad) y `apps/backoffice`
 * (que valida antes de enviar) no los escriban dos veces.
 */
export const LIBRO_ANIO_MINIMO = 1900;

/** No hay libro de la editorial de 1850, pero sí puede haber uno por publicarse el año próximo. */
export function libroAnioMaximo(): number {
  return new Date().getFullYear() + 1;
}

/** H-89: con el default "último lugar" (máximo actual + 1), este máximo es una red, no el control principal. */
export const LIBRO_ORDEN_MAXIMO = 9999;

/** Forma expuesta por GET /libros, GET /libros/:id. */
export interface Libro {
  id: string;
  titulo: string;
  autor: string;
  anio: number;
  descripcion: string | null;
  orden: number;
  /** Par con `portadaDescripcion` — los dos juntos o ninguno de los dos (FR-025). */
  portadaUrl: string | null;
  portadaDescripcion: string | null;
  activo: boolean;
  /** D119: `null` si no está eliminado — GET /libros y /libros/:id nunca devuelven uno eliminado, solo GET /libros/papelera (Admin, H-129). */
  eliminadoEn: string | null;
}

/** Body de POST /libros. La portada entra por su propio endpoint (FR-021). */
export interface CrearLibroInput {
  titulo: string;
  autor: string;
  anio: number;
  descripcion?: string;
  orden?: number;
}

/** Body de PATCH /libros/:id — cualquier subconjunto, más el toggle de soft delete. */
export type ActualizarLibroInput = Partial<CrearLibroInput> & { activo?: boolean };
