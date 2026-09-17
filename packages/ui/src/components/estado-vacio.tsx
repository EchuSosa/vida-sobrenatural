import type { ReactNode } from 'react';
import { cn } from '../lib/utils';

export interface EstadoVacioProps {
  /** Mensaje amable — nunca un texto técnico ni "No hay datos" seco. */
  mensaje: string;
  /** Acción sugerida opcional (ej. un link a otra sección). */
  accion?: ReactNode;
  className?: string;
}

/**
 * Estado vacío reutilizable — FR-005 (specs/002-base-transversal): toda
 * sección de menú sin funcionalidad propia todavía muestra esto en vez de un
 * error o una página en blanco.
 */
export function EstadoVacio({ mensaje, accion, className }: EstadoVacioProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-6 py-16 text-center',
        className,
      )}
    >
      <p className="text-muted-foreground">{mensaje}</p>
      {accion}
    </div>
  );
}
