/** Forma expuesta por GET /palabra-profetica. */
export interface PalabraProfetica {
  id: string;
  anio: number;
  titulo: string;
  texto: string;
  /** D121: opcional — puede llegar después del anuncio, o no llegar nunca. */
  youtubeUrl: string | null;
  /** D121: `null` si `youtubeUrl` es `null`. */
  youtubeVideoId: string | null;
  vigente: boolean;
  createdAt: string;
}

/** Body de POST /palabra-profetica. */
export interface CrearPalabraProfeticaInput {
  anio: number;
  titulo: string;
  texto: string;
  /** D121: opcional. */
  youtubeUrl?: string;
}

/** Body de PATCH /palabra-profetica/:id — cualquier subconjunto. */
export type ActualizarPalabraProfeticaInput = Partial<CrearPalabraProfeticaInput>;
