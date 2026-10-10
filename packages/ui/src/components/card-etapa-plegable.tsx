'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';

/**
 * Mi camino, propuesta A (Echu, 2026-10-10): el encabezado y el cuerpo de una
 * card plegable (patrón acordeón de WAI-ARIA: el botón va DENTRO del `<h2>`,
 * con `aria-expanded` y `aria-controls`). Plegada, el cuerpo tiene `hidden`.
 * Se abre sola cuando la URL apunta a `#idAncla` (al cargar y en cada cambio
 * de `#`): así el resumen de arriba y los `router.push('/mi-camino#etapa-…')`
 * que ya existían caen en la card abierta.
 */
export function PlegableEtapa({
  idTitulo,
  idCuerpo,
  idAncla,
  titulo,
  resumen,
  icono,
  abiertaAlInicio,
  children,
}: {
  idTitulo: string;
  idCuerpo: string;
  idAncla: string;
  titulo: string;
  resumen: string;
  icono: ReactNode;
  abiertaAlInicio: boolean;
  children: ReactNode;
}) {
  const [abierta, setAbierta] = useState(abiertaAlInicio);

  useEffect(() => {
    const revisar = () => {
      if (window.location.hash === `#${idAncla}`) setAbierta(true);
    };
    revisar();
    window.addEventListener('hashchange', revisar);
    return () => window.removeEventListener('hashchange', revisar);
  }, [idAncla]);

  return (
    <>
      <h2 className="text-xl font-semibold">
        <button
          type="button"
          aria-expanded={abierta}
          aria-controls={idCuerpo}
          onClick={() => setAbierta((a) => !a)}
          className="flex min-h-16 w-full items-center gap-3 rounded-lg p-5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span id={idTitulo}>{titulo}</span>
            <span className="flex items-start gap-2 text-base font-medium">
              <span className="mt-0.5 flex shrink-0 [&_svg]:size-5" aria-hidden="true">
                {icono}
              </span>
              {resumen}
            </span>
          </span>
          <ChevronDown aria-hidden className={cn('size-6 shrink-0 text-muted-foreground transition-transform', abierta && 'rotate-180')} />
        </button>
      </h2>
      <div id={idCuerpo} hidden={!abierta} className="flex flex-col gap-4 px-5 pb-5">
        {children}
      </div>
    </>
  );
}
