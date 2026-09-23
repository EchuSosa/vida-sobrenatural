import type { ReactNode } from 'react';
import { cn } from '../lib/utils';

/**
 * Lote de fotos reales (docs/claude_20-fotos-web-publica.md, regla 2 —
 * corregida en este mismo commit: apuntaba a un archivo y a un H-número
 * que no existen). Tres páginas de este lote llevan una cabecera con texto
 * sobre foto (Inicio, Primeros pasos, Visitanos) — un componente
 * compartido acá en vez de escribir el velo tres veces: la próxima que lo
 * necesite lo usa, no lo reinventa (Principio XI).
 *
 * `packages/ui` no depende de Next (docs/10-stack-tecnico.md) — el `<Image
 * fill priority? sizes=.../>` de `next/image`, con su import estático del
 * archivo real, lo arma quien consume (`apps/web`) y lo pasa por `foto`.
 * Este componente solo pone el velo y el contenido encima — capa 2 (el
 * patrón de accesibilidad/contraste), no capa 1 (la imagen en sí).
 *
 * La proporción del marco (16:9 para `hero/`, 4:3 para una cabecera
 * armada con una foto de `cards/` — R2 de docs/claude_20-fotos-web-
 * publica.md: no se mezclan las proporciones de carpeta) la decide quien
 * llama, vía `className` (`aspect-video`, `aspect-[4/3]`, …) — este
 * componente no asume ninguna.
 *
 * EL VELO — provisorio de este lote, no una decisión de diseño cerrada.
 * La diseñadora lo va a revisar cuando lleguen las fotos definitivas.
 *
 * - Opacidad PAREJA sobre toda la foto, no un degradé: un degradé se ve
 *   mejor, pero el contraste real depende de en qué línea exacta cae el
 *   texto, y eso varía con el texto de cada página y con el recorte de
 *   cada foto — no se puede garantizar. Con un velo parejo, el peor caso
 *   es medible una sola vez y vale para cualquier posición del texto
 *   adentro del marco.
 * - Medido, no mirado (WCAG 2.2 AA: 4.5:1 texto normal, 3:1 texto grande
 *   — párrafo y `<h1>` respectivamente). Contra las tres fotos de
 *   `hero/` (aunque este lote solo use `hero-culto-congregacion`, D122 ya
 *   usa `hero-adoracion-mujeres` y el documento deja `hero-multitud-bn`
 *   como alternativa futura — si una opacidad sirve para la foto clara y
 *   arruina la oscura, ese es el número que importa, no el de la foto que
 *   tocó esta vez): parche de ~1/48 del ancho (una foto reducida a 48×27,
 *   el promedio de cada bloque en vez de un píxel suelto de brillo
 *   espurio), el más claro de cada una, velado con `--velo-heroe` en
 *   sRGB y comparado contra blanco (`--velo-heroe-texto`):
 *
 *   | Foto                      | Zona más clara (sRGB) | α=0.55  | α=0.65  |
 *   |---------------------------|------------------------|---------|---------|
 *   | hero-culto-congregacion   | 203,222,204            | 4.71:1  | 6.16:1  |
 *   | hero-multitud-bn          | 255,255,255 (blanco)   | 3.69:1  | 5.02:1  |
 *   | hero-adoracion-mujeres    | 222,219,220            | 4.59:1  | 6.06:1  |
 *
 *   `hero-multitud-bn` (blanco y negro, la más clara de las tres) es la
 *   que manda: a 0.55 no llega a 4.5:1 para texto normal (sí a las otras
 *   dos, y sí llegaría para texto GRANDE — 3.69 > 3 — si esta página
 *   nunca pusiera texto normal encima). Con **α=0.65** las tres pasan
 *   4.5:1 con margen — script y método en el propio commit, no a mano.
 */
export interface HeroConFotoProps {
  foto: ReactNode;
  children: ReactNode;
  className?: string;
}

export function HeroConFoto({ foto, children, className }: HeroConFotoProps) {
  return (
    // `aspect-video`/`aspect-[4/3]` (className, R2) es una ALTURA MÍNIMA
    // acá, no fija: `overflow-hidden` NO va en el mismo elemento que
    // `aspect-ratio` — juntos, un navegador recorta el contenido que no
    // entra en vez de dejar crecer la caja (encontrado recién probando
    // esto en celular: el <h1> desaparecía, recortado por arriba). Este
    // div de afuera se banca la proporción (o crece más si el contenido
    // lo necesita) sin overflow propio; el que SÍ recorta (para las
    // esquinas redondeadas) es el de adentro, que solo envuelve la foto —
    // absoluto, cubre siempre el alto real de la caja de afuera, sea el
    // de la proporción o el que el contenido la obligó a crecer.
    <div className={cn('relative isolate flex flex-col justify-end gap-4 p-6 text-velo-heroe-texto sm:p-10', className)}>
      <div className="absolute inset-0 -z-10 overflow-hidden rounded-lg">
        {foto}
        <div className="absolute inset-0 bg-velo-heroe/65" aria-hidden="true" />
      </div>
      {children}
    </div>
  );
}
