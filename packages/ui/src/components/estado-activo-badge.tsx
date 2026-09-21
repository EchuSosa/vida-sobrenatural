import { CircleCheck, CircleX } from 'lucide-react';
import { cn } from '../lib/utils';

export interface EstadoActivoBadgeProps {
  activo: boolean;
  className?: string;
  /** Concordancia de género del catálogo — "Sede" es femenino, "Curso" no lo es. */
  textoActivo?: string;
  textoInactivo?: string;
}

/**
 * H-51 (revisión manual ronda 4, D117): estado de un registro de catálogo
 * (Sede, y a futuro Cursos/Ministerios/Células) en texto + ícono — nunca
 * solo color (D81). Primera pieza compartida de "lo dado de baja se ve" —
 * Sedes es el primer catálogo con listado real; el resto la reutiliza
 * cuando llegue (Principio XI).
 */
export function EstadoActivoBadge({
  activo,
  className,
  textoActivo = 'Activa',
  textoInactivo = 'Inactiva',
}: EstadoActivoBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-sm font-medium',
        activo ? 'text-emerald-700 dark:text-emerald-400' : 'text-muted-foreground',
        className,
      )}
    >
      {activo ? <CircleCheck className="size-4" aria-hidden="true" /> : <CircleX className="size-4" aria-hidden="true" />}
      {activo ? textoActivo : textoInactivo}
    </span>
  );
}
