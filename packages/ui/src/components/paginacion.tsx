'use client';

import type { ReactElement, ReactNode } from 'react';
import { useRender } from '@base-ui/react/use-render';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../lib/utils';
import { buttonVariants } from './ui/button';

/**
 * Cierre de H-101 (paginado server-side) antes de la spec 004, que trae
 * cinco listados nuevos: acá se fija el patrón para que nazcan bien, en vez
 * de con "cargar más" acumulando estado en cliente.
 *
 * Misma división que `ControlesTabla`/`useControlesTablaUrl` (H-88/D126):
 * este componente es puramente controlado y agnóstico de routing —
 * `packages/ui` no depende de Next (docs/10-stack-tecnico.md), así que NO
 * sabe nada de `next/navigation` ni de `next/link`. Quien arma la URL de
 * cada página es quien consume el componente (`apps/backoffice`).
 */
export interface PaginacionProps {
  /** 1-based — es lo que ve la persona en la URL (`?pagina=2`), no el `skip` de la API. */
  paginaActual: number;
  totalPaginas: number;
  /**
   * Construye el enlace hacia una página dada — mismo criterio que
   * `ButtonLink` con su prop `render` (packages/ui/src/components/ui/
   * button-link.tsx, H-100/H-01): sin poder importar `next/link` acá, quien
   * consume el componente pasa CÓMO armar cada enlace.
   *
   * ```tsx
   * <Paginacion
   *   paginaActual={pagina}
   *   totalPaginas={totalPaginas}
   *   renderEnlace={(p) => <Link href={`${pathname}?${conPagina(searchParams, p)}`} />}
   * />
   * ```
   *
   * El elemento que devuelve NO lleva hijos (como `<Link href="..." />` en
   * el ejemplo de `ButtonLink`) — el contenido (el número, "Anterior",
   * "Siguiente") lo pone este componente.
   */
  renderEnlace: (pagina: number) => ReactElement;
  /** `aria-label` del `<nav>`. Default: "Paginado". */
  etiquetaNav?: string;
  etiquetaAnterior?: string;
  etiquetaSiguiente?: string;
  className?: string;
}

type ItemPagina = number | 'elipsis';

/**
 * Qué números mostrar cuando hay más páginas de las que entran (B5):
 * siempre la primera y la última, más la página actual y sus dos vecinas
 * inmediatas (actual-1, actual, actual+1). Un hueco de más de una página
 * entre dos números consecutivos de ese núcleo se muestra como "…" — sin
 * enlace, no hay a dónde saltar "a la mitad" de un hueco.
 *
 * Ej. actual=5, total=20 → 1, …, 4, 5, 6, …, 20.
 * Ej. actual=2, total=20 → 1, 2, 3, …, 20 (no hay hueco entre 1 y 3).
 */
function calcularNumerosAMostrar(paginaActual: number, totalPaginas: number): ItemPagina[] {
  const nucleo = new Set<number>([1, totalPaginas]);
  for (const p of [paginaActual - 1, paginaActual, paginaActual + 1]) {
    if (p >= 1 && p <= totalPaginas) nucleo.add(p);
  }
  const numeros = [...nucleo].sort((a, b) => a - b);
  const items: ItemPagina[] = [];
  for (const [indice, numero] of numeros.entries()) {
    if (indice > 0 && numero - numeros[indice - 1] > 1) items.push('elipsis');
    items.push(numero);
  }
  return items;
}

interface EnlacePaginaProps {
  render: ReactElement;
  className: string;
  ariaLabel: string;
  children: ReactNode;
}

/**
 * Un solo `useRender` por instancia (H-100/H-01, mismo mecanismo que
 * `ButtonLink`) — no se puede llamar `useRender` a mano dentro del `.map()`
 * de `Paginacion` (rompería las reglas de hooks apenas cambiara la cantidad
 * de páginas a mostrar); un sub-componente aparte, montado una vez por
 * enlace, sí puede.
 *
 * Nunca se usa para la página actual (esa es un `<span
 * aria-current="page">`, no un enlace — ver más abajo) ni para un estado
 * deshabilitado (`BotonInerte`) — solo para destinos que de verdad navegan.
 */
function EnlacePagina({ render, className, ariaLabel, children }: EnlacePaginaProps) {
  return useRender({
    defaultTagName: 'a',
    render,
    state: {},
    props: {
      className,
      'aria-label': ariaLabel,
      children,
    },
  });
}

/** B3: anterior/siguiente deshabilitados son texto, no un enlace inerte — un `<span>`, nunca un `<a>` sin `href` útil. */
function BotonInerte({ className, children }: { className: string; children: ReactNode }) {
  return (
    <span aria-disabled="true" className={cn(className, 'pointer-events-none opacity-50')}>
      {children}
    </span>
  );
}

// H-56 (button.tsx): `lg` es el tamaño "genérico" más grande disponible —
// `xl` queda reservado para los CTA de pantalla completa que le dieron
// origen. Generoso para un área de click (B4) sin inflar una fila de
// números al ancho de un botón de pantalla completa.
const TAMANIO = 'lg' as const;

export function Paginacion({
  paginaActual,
  totalPaginas,
  renderEnlace,
  etiquetaNav = 'Paginado',
  etiquetaAnterior = 'Anterior',
  etiquetaSiguiente = 'Siguiente',
  className,
}: PaginacionProps) {
  // Una sola página (o ninguna) no tiene nada que paginar.
  if (totalPaginas <= 1) return null;

  const items = calcularNumerosAMostrar(paginaActual, totalPaginas);
  const hayAnterior = paginaActual > 1;
  const haySiguiente = paginaActual < totalPaginas;
  const claseNavegacion = cn(buttonVariants({ variant: 'outline', size: TAMANIO }), 'gap-1.5');
  const claseNumero = (esActual: boolean) =>
    cn(buttonVariants({ variant: esActual ? 'default' : 'outline', size: TAMANIO }), 'min-w-9 justify-center');

  return (
    <nav aria-label={etiquetaNav} className={cn('flex flex-col items-center gap-3', className)}>
      {/* B4: en palabras, no solo números — "Página 2 de 7" es legible sin
          tener que contar ni comparar tamaños de fuente. */}
      <p className="text-sm font-medium text-foreground">
        Página {paginaActual} de {totalPaginas}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {hayAnterior ? (
          <EnlacePagina render={renderEnlace(paginaActual - 1)} className={claseNavegacion} ariaLabel={`${etiquetaAnterior} — página ${paginaActual - 1}`}>
            <ChevronLeft aria-hidden="true" className="size-4" />
            {etiquetaAnterior}
          </EnlacePagina>
        ) : (
          <BotonInerte className={claseNavegacion}>
            <ChevronLeft aria-hidden="true" className="size-4" />
            {etiquetaAnterior}
          </BotonInerte>
        )}

        {items.map((item, indice) =>
          item === 'elipsis' ? (
            // Las elipsis no tienen identidad propia — el índice alcanza como key (nunca cambian de posición relativa a sus vecinos en la misma corrida de render).
            <span key={`elipsis-${indice}`} aria-hidden="true" className="px-1.5 text-muted-foreground">
              …
            </span>
          ) : item === paginaActual ? (
            // B3: la página actual tampoco es un enlace — mismo criterio
            // que el último tramo de MigaDePan (docs/15-guia-ux-ui.md):
            // que no se pueda clickear es parte de lo que la vuelve
            // entendible como "acá estás".
            <span key={item} aria-current="page" className={claseNumero(true)}>
              {item}
            </span>
          ) : (
            <EnlacePagina key={item} render={renderEnlace(item)} className={claseNumero(false)} ariaLabel={`Ir a la página ${item}`}>
              {item}
            </EnlacePagina>
          ),
        )}

        {haySiguiente ? (
          <EnlacePagina render={renderEnlace(paginaActual + 1)} className={claseNavegacion} ariaLabel={`${etiquetaSiguiente} — página ${paginaActual + 1}`}>
            {etiquetaSiguiente}
            <ChevronRight aria-hidden="true" className="size-4" />
          </EnlacePagina>
        ) : (
          <BotonInerte className={claseNavegacion}>
            {etiquetaSiguiente}
            <ChevronRight aria-hidden="true" className="size-4" />
          </BotonInerte>
        )}
      </div>
    </nav>
  );
}
