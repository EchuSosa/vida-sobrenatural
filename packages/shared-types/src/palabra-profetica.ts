/**
 * H-93 (mismo criterio que `LIBRO_ANIO_MINIMO`/`LIBRO_ORDEN_MAXIMO`,
 * `packages/shared-types/src/libro.ts`): `texto` no tenía ningún límite,
 * ni en la API ni en la UI. La Palabra Profética 2021 real (publicada)
 * tiene 12.409 caracteres — este límite deja holgura de sobra y evita que
 * alguien mande megabytes. Un solo valor acá para que `apps/api` (que lo
 * valida de verdad) y `apps/backoffice` (que valida antes de enviar) no
 * lo escriban dos veces (Principio XI).
 */
export const PALABRA_PROFETICA_TEXTO_MAXIMO = 50_000;

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
