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
