'use client';

import type { ReactNode } from 'react';
import { CircleAlert } from 'lucide-react';
import { Button, Skeleton } from '@vida-sobrenatural/ui';

/**
 * spec 013 (D209, docs/15 "Bloques independientes"): el marco de un bloque del
 * Inicio — título y sus cuatro estados. Si su consulta falla, muestra el
 * error con "Reintentar" y los demás bloques siguen.
 */
export function Bloque({
  id,
  titulo,
  estado,
  mensajeError,
  etiquetaReintentar,
  etiquetaCargando,
  reintentar,
  children,
}: {
  id: string;
  titulo: string;
  estado: 'cargando' | 'error' | 'listo';
  mensajeError: string;
  etiquetaReintentar: string;
  etiquetaCargando: string;
  reintentar: () => void;
  children?: ReactNode;
}) {
  return (
    <section aria-labelledby={id} aria-busy={estado === 'cargando'} className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 text-card-foreground">
      <h2 id={id} className="text-lg font-semibold">
        {titulo}
      </h2>
      {estado === 'cargando' ? (
        <div className="flex flex-col gap-3" role="status" aria-label={etiquetaCargando}>
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-6 w-1/2" />
        </div>
      ) : estado === 'error' ? (
        <div role="alert" className="flex flex-col items-start gap-3">
          <p className="flex items-start gap-2">
            <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
            {mensajeError}
          </p>
          <Button variant="outline" onClick={reintentar}>
            {etiquetaReintentar}
          </Button>
        </div>
      ) : (
        children
      )}
    </section>
  );
}
