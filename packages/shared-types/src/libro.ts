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
  /** D119: `null` si no está eliminado — GET /libros y /libros/:id nunca devuelven uno eliminado, solo GET /libros?estado=papelera. */
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
