import type { ComponentType, ReactNode } from 'react';

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
            <li key={tramo.label} className="flex items-center gap-1.5">
              {indice > 0 && (
                <span aria-hidden="true">/</span>
              )}
              {esUltimo || !tramo.href ? (
                <span aria-current={esUltimo ? 'page' : undefined} className={esUltimo ? 'font-medium text-foreground' : undefined}>
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
