import * as React from 'react';
import { cn } from '../lib/utils';

export interface BarraProporcionProps {
  /** Porcentaje, 0 a 100 (se recorta a ese rango). */
  porcentaje: number;
  className?: string;
}

/**
 * spec 013 (FR-023): una barra horizontal que acompaña a un número y su
 * porcentaje escritos al lado — decorativa (`aria-hidden`): el dato está en el
 * texto, nunca solo en la barra (D81). Color del token `--primary` sobre
 * `--muted` (D118); sin animación.
 */
export function BarraProporcion({ porcentaje, className }: BarraProporcionProps) {
  const ancho = Math.min(100, Math.max(0, Number.isFinite(porcentaje) ? porcentaje : 0));
  return (
    <div aria-hidden className={cn('h-2 w-full overflow-hidden rounded-full bg-muted', className)}>
      <div className="h-full rounded-full bg-primary" style={{ width: `${ancho}%` }} />
    </div>
  );
}
