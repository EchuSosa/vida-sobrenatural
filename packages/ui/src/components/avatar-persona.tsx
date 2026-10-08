'use client';

import * as React from 'react';
import { iniciales } from '@vida-sobrenatural/shared-types';
import { cn } from '../lib/utils';

export interface AvatarPersonaProps {
  nombre: string;
  apellido: string;
  fotoUrl?: string | null;
  /**
   * Texto alternativo de la foto ("Foto de <nombre>", H2.1). Sin él la foto es
   * decorativa (`alt=""`): para cuando el nombre ya está escrito al lado, como
   * en una fila de tabla.
   */
  textoAlternativo?: string;
  tamanio?: 'sm' | 'md' | 'lg';
  className?: string;
}

const TAMANIOS = {
  sm: 'size-8 text-xs',
  md: 'size-11 text-sm',
  lg: 'size-20 text-2xl',
} as const;

/**
 * spec 013 (D87, FR-011, FR-018): la foto de Google de una Persona o, si no
 * tiene (o no carga), sus iniciales sobre `--secondary` — nunca una caja gris
 * vacía. El par `secondary`/`secondary-foreground` tiene contraste medido en
 * los dos temas (docs/17). Sin `next/image`: `packages/ui` no depende de Next.
 */
export function AvatarPersona({ nombre, apellido, fotoUrl, textoAlternativo, tamanio = 'md', className }: AvatarPersonaProps) {
  const [fallo, setFallo] = React.useState(false);
  const clases = cn('inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full', TAMANIOS[tamanio], className);

  if (fotoUrl && !fallo) {
    return (
      <img
        src={fotoUrl}
        alt={textoAlternativo ?? ''}
        referrerPolicy="no-referrer"
        loading="lazy"
        onError={() => setFallo(true)}
        className={cn(clases, 'object-cover')}
      />
    );
  }
  return (
    <span
      className={cn(clases, 'bg-secondary font-semibold text-secondary-foreground')}
      // Las iniciales repiten el nombre que ya está al lado: solo se anuncian si hay texto alternativo.
      {...(textoAlternativo ? { role: 'img', 'aria-label': textoAlternativo } : { 'aria-hidden': true })}
    >
      {iniciales(nombre, apellido)}
    </span>
  );
}
