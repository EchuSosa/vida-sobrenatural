import heroCultoCongregacion from './hero/hero-culto-congregacion.webp';
import cardBienvenidaEquipo from './cards/card-bienvenida-equipo.webp';
import cardCultoManos from './cards/card-culto-manos.webp';

/**
 * H-123: el único lugar que declara qué foto va en cada cabecera con texto
 * (`HeroConFoto`, packages/ui). Dos consumidores de este mismo archivo:
 *
 * 1. Las páginas TOMAN su imagen de acá — no importan una foto de `hero/`
 *    ni de `cards/` directo para pasarla a `HeroConFoto` (ver Inicio,
 *    Primeros pasos, Visitanos).
 * 2. `scripts/chequear-contraste-velo.mjs` LEE el código fuente de este
 *    archivo (no lo ejecuta) para saber contra qué fotos medir el
 *    contraste del velo.
 *
 * El motivo de juntar los dos en un solo archivo: si una cabecera nueva no
 * pasa por acá, el chequeo de contraste no se entera de que existe — y
 * pasaría en verde midiendo fotos viejas, que es exactamente lo que este
 * hallazgo (H-123) encontró que ya había pasado. Agregar una foto acá es lo
 * que la vuelve medible; no hay una lista aparte que mantener sincronizada.
 *
 * Esto no impide con el compilador que alguien importe una foto de `hero/`
 * o `cards/` directo en una página nueva sin pasar por acá — es una
 * convención, reforzada por este comentario y por el reporte de H-123, no
 * una regla mecánica (ver el reporte de la conversación para la propuesta
 * de una guardia, no implementada en este lote).
 */
export const FOTOS_HEROE = {
  inicio: heroCultoCongregacion,
  primerosPasos: cardBienvenidaEquipo,
  visitanos: cardCultoManos,
} as const;
