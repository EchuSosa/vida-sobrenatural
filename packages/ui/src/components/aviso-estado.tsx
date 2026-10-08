import type { ReactNode } from 'react';
import { cn } from '../lib/utils';

export interface AvisoEstadoProps {
  /** Ícono decorativo (se marca `aria-hidden`): el título ya dice lo que pasa (D81). */
  icono: ReactNode;
  titulo: string;
  /** Qué sigue ("¿Y ahora qué?", docs/15). */
  children?: ReactNode;
  /** `nota` lo anuncia como una nota (avisos que no son el estado principal, ej. un Ministerio pausado). */
  role?: 'note' | 'status';
  className?: string;
}

/**
 * spec 009, T011 (FR-011, Principio XI): un estado con ícono + título + texto,
 * nunca solo color (D81, H-55). Mismo dibujo que el `Aviso` de la tarjeta de
 * Vida Nueva (`mi-camino-cliente.tsx`), que puede pasar a usarlo cuando su
 * dueña lo toque. Sin colores propios: el ícono trae su clase de token.
 */
export function AvisoEstado({ icono, titulo, children, role, className }: AvisoEstadoProps) {
  return (
    <div role={role} className={cn('flex gap-3', className)}>
      <span aria-hidden className="mt-0.5 flex shrink-0 [&_svg]:size-5">
        {icono}
      </span>
      <div className="flex min-w-0 flex-col gap-1">
        <p className="font-medium">{titulo}</p>
        {children && <div className="text-muted-foreground">{children}</div>}
      </div>
    </div>
  );
}
