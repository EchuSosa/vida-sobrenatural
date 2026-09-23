import type { ReactNode } from 'react';
import { cn } from '../lib/utils';

/**
 * Lote de fotos reales (docs/claude_20-fotos-web-publica.md, regla 2 —
 * corregida en el commit 97f662d: apuntaba a un archivo y a un H-número
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
 * - Opacidad PAREJA sobre toda la foto (`--velo-heroe-opacidad`, único
 *   valor — ver theme.css), no un degradé: un degradé se ve mejor, pero
 *   el contraste real depende de en qué línea exacta cae el texto, y eso
 *   varía con el texto de cada página y con el recorte de cada foto — no
 *   se puede garantizar. Con un velo parejo, el peor caso es medible una
 *   sola vez y vale para cualquier posición del texto adentro del marco.
 * - H-123: medido, no mirado — pero la medición YA NO vive acá ni en
 *   ningún comentario. `pnpm run check:contraste-velo`
 *   (scripts/chequear-contraste-velo.mjs, adentro de `pnpm check`) mide
 *   de verdad, en cada corrida, el contraste contra CADA foto declarada
 *   en `apps/web/src/assets/images/fotos-heroe.ts` — el registro único
 *   del que las páginas toman su imagen de héroe. Si esto tuviera una
 *   tabla de números fijos acá (como tenía antes de H-123), esos números
 *   podrían divergir en silencio de la realidad el día que cambien las
 *   fotos, el velo o el umbral — exactamente lo que encontró H-123, y el
 *   mismo animal que `breaks: false` en H-122. El script es la única
 *   fuente de verdad; si querés los números de hoy, correlo.
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
        {/*
          H-123: la opacidad NO es un modificador de Tailwind (`/65`) a
          propósito — un modificador así queda escrito en la clase, un
          número aparte del token `--velo-heroe-opacidad`, y el día que
          alguien cambie uno y no el otro, componente y
          chequear-contraste-velo.mjs divergen en silencio. `color-mix`
          en `style` lee el MISMO token que lee el script — un solo
          lugar, sin importar por dónde se mire.
        */}
        <div
          className="absolute inset-0"
          style={{ backgroundColor: 'color-mix(in oklab, var(--velo-heroe) var(--velo-heroe-opacidad), transparent)' }}
          aria-hidden="true"
        />
      </div>
      {children}
    </div>
  );
}
