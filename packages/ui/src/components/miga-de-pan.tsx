import type { ComponentType, ReactNode } from 'react';
import { cn } from '../lib/utils';

export interface TramoMiga {
  label: string;
  href?: string;
}

export interface MigaDePanProps {
  tramos: TramoMiga[];
  /** aria-label del <nav> — por defecto "Ruta". */
  etiqueta?: string;
  /** Componente de enlace de la app consumidora (ej. next/link `Link`) para navegación sin recarga completa; sin esto, un `<a>` común. */
  LinkComponente?: ComponentType<{ href: string; className?: string; children: ReactNode }>;
}

/**
 * H-81/H-95: antes de este componente, "volver a X" era un enlace escrito a
 * mano en cada pantalla, en una ubicación distinta cada vez (dos papeleras
 * del backoffice lo tenían debajo del título) y ausente donde hacía falta
 * (las subpáginas de Nosotros, `/ministerios`). Un solo componente compartido
 * resuelve los dos huecos (Principio XI).
 *
 * La ruta SIEMPRE se arma a partir de la jerarquía del contenido (los
 * `tramos` que recibe, fijos por página) — nunca de `document.referrer`, del
 * historial ni de un query param: si dependiera de cómo se llegó, la misma
 * URL mostraría rutas distintas y dejaría de servir para orientarse. Para
 * "volver a lo anterior" ya está el botón del navegador.
 */
export function MigaDePan({ tramos, etiqueta = 'Ruta', LinkComponente }: MigaDePanProps) {
  const Enlace = LinkComponente ?? 'a';

  return (
    <nav aria-label={etiqueta}>
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        {tramos.map((tramo, indice) => {
          const esUltimo = indice === tramos.length - 1;
          return (
            <li
              key={tramo.label}
              // H-103/docs/15-guia-ux-ui.md punto 7: el último tramo (título
              // de Libro, nombre de Sede) se recorta con puntos suspensivos
              // en pantallas chicas — `min-w-0` es lo que deja que un hijo
              // flex se achique por debajo de su ancho de contenido, sin eso
              // `truncate` no tiene efecto adentro de un flex.
              className={cn('flex items-center gap-1.5', esUltimo && 'min-w-0')}
            >
              {/* H-103/docs/15-guia-ux-ui.md: separador ›, no / — la barra se
                  lee como parte de una dirección web, el chevrón como
                  "adentro de" (el público de esta app no es técnico). */}
              {indice > 0 && (
                <span aria-hidden="true">›</span>
              )}
              {esUltimo || !tramo.href ? (
                <span
                  aria-current={esUltimo ? 'page' : undefined}
                  className={cn(esUltimo && 'truncate font-medium text-foreground')}
                >
                  {tramo.label}
                </span>
              ) : (
                <Enlace href={tramo.href} className="underline underline-offset-4 hover:text-foreground">
                  {tramo.label}
                </Enlace>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
