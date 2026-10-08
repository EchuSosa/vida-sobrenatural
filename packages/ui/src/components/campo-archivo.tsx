'use client';

import * as React from 'react';
import { useId, useRef, type ChangeEvent } from 'react';
import { FileUp } from 'lucide-react';
import { cn } from '../lib/utils';

/**
 * spec 011 (T021, compartido con la 008): campo para elegir un archivo.
 * Etiqueta visible, ayuda con tipos y tamaño, el nombre del archivo elegido,
 * error por campo asociado con `aria-describedby` (H-50) y operable con
 * teclado (es un `<input type="file">` real, con el botón visible encima).
 * Todo texto por prop (D84). No valida: quien lo usa decide qué tipos y qué
 * tamaño acepta (`accept` es solo una ayuda del navegador) y pasa el error.
 */
export interface CampoArchivoProps {
  /** `campo-<nombre>`: a donde enlaza `ResumenErrores`. */
  id: string;
  etiqueta: string;
  /** "JPG, PNG o WebP, hasta 5 MB." */
  ayuda: string;
  /** Texto del botón ("Elegir archivo"). */
  textoBoton: string;
  /** "Ningún archivo elegido". */
  textoSinArchivo: string;
  accept: string;
  archivo: File | null;
  onElegir: (archivo: File | null) => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  /** D150: `base` (16 px) en `apps/web`; `sm` en el backoffice. */
  tamanoTexto?: 'sm' | 'base';
  className?: string;
}

export function CampoArchivo({
  id,
  etiqueta,
  ayuda,
  textoBoton,
  textoSinArchivo,
  accept,
  archivo,
  onElegir,
  error,
  disabled,
  required,
  tamanoTexto = 'sm',
  className,
}: CampoArchivoProps) {
  const texto = tamanoTexto === 'base' ? 'text-base' : 'text-sm';
  const base = useId();
  const idAyuda = `${base}-ayuda`;
  const idError = `${base}-error`;
  const idNombre = `${base}-nombre`;
  const input = useRef<HTMLInputElement>(null);

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <label htmlFor={id} className={cn(texto, 'font-medium')}>
        {etiqueta}
      </label>
      <p id={idAyuda} className={cn(texto, 'text-muted-foreground')}>
        {ayuda}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <span className="relative inline-flex">
          <input
            ref={input}
            id={id}
            type="file"
            accept={accept}
            disabled={disabled}
            required={required}
            aria-invalid={error ? true : undefined}
            aria-describedby={[idAyuda, idNombre, error ? idError : null].filter(Boolean).join(' ')}
            onChange={(e: ChangeEvent<HTMLInputElement>) => onElegir(e.target.files?.[0] ?? null)}
            className="peer absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
          />
          <span
            aria-hidden="true"
            className={cn("inline-flex h-11 items-center gap-2 rounded-md border border-input bg-background px-4 font-medium", texto, " peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-background peer-disabled:opacity-50 peer-aria-invalid:border-destructive")}
          >
            <FileUp className="size-4" />
            {textoBoton}
          </span>
        </span>
        <span id={idNombre} className={cn('min-w-0 break-all text-muted-foreground', texto)}>
          {archivo ? archivo.name : textoSinArchivo}
        </span>
      </div>
      {error && (
        <p id={idError} className={cn('font-normal text-destructive', texto)}>
          {error}
        </p>
      )}
    </div>
  );
}
