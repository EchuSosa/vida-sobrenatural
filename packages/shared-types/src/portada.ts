/**
 * Constantes compartidas de portada de Libro (D110, Principio XI) —
 * consumidas por `apps/api` (validación real) y `apps/backoffice`
 * (validación de UI antes de subir), para que "5 MB" y los tipos
 * permitidos no diverjan entre las dos. Ver data-model.md y research.md
 * Decisión 5 de specs/003-contenido-institucional.
 */
export const MIME_TIPOS_PORTADA_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp'] as const;

export type MimeTipoPortada = (typeof MIME_TIPOS_PORTADA_PERMITIDOS)[number];

export const PORTADA_TAMANO_MAXIMO_BYTES = 5 * 1024 * 1024;

/** FR-024: proporción vertical de tapa a la que se recorta centrada toda portada que no la tenga ya. */
export const PORTADA_ASPECTO = { ancho: 2, alto: 3 } as const;
