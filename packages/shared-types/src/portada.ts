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

/**
 * FR-024: proporción de la caja donde se muestra cada portada (tarjeta
 * pública, detalle del backoffice) — ya no se recorta a esto (D110
 * enmendada), la imagen entra completa con `object-contain`.
 *
 * **Temporal, 1:1 (revisión manual, portadas reales de Ediciones VS,
 * 2026-09-24, D125):** el contenido actual son fotos provisorias de los
 * libros, casi todas cuadradas (0.81 a 1.30 de alto/ancho) — en una caja
 * 2:3 una foto cuadrada deja 33% de aire y la más extrema ("Vida nueva")
 * 46% (se leen rotas, no diseñadas); en una caja cuadrada el peor caso
 * baja a 23%. Vuelve a `{ ancho: 2, alto: 3 }` cuando lleguen las tapas
 * reales de la editorial, que sí son verticales — ver
 * `apps/api/prisma/portadas/README.md`.
 */
export const PORTADA_ASPECTO = { ancho: 1, alto: 1 } as const;
