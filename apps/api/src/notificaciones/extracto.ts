/** spec 012, FR-002 — largo del extracto de un aviso manual en la lista. */
export const LARGO_EXTRACTO = 140;

/**
 * Los primeros 140 caracteres del mensaje sin cortar palabras (FR-002): si
 * hay que recortar, corta en el último espacio antes del límite y agrega "…";
 * un mensaje sin espacios se corta en seco. Los saltos de línea cuentan como
 * espacio (en la lista el extracto va en una sola línea).
 */
export function extractoDe(mensaje: string, largo = LARGO_EXTRACTO): string {
  const plano = mensaje.replace(/\s+/g, ' ').trim();
  if (plano.length <= largo) return plano;
  const corte = plano.slice(0, largo + 1);
  const ultimoEspacio = corte.lastIndexOf(' ');
  const recortado = ultimoEspacio > 0 ? corte.slice(0, ultimoEspacio) : plano.slice(0, largo);
  return `${recortado.trimEnd()}…`;
}
