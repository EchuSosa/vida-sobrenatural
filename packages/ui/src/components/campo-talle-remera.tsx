'use client';

import { TALLES_REMERA, type TalleRemera } from '@vida-sobrenatural/shared-types';
import { MensajeErrorCampo } from './form-errors';
import { cn } from '../lib/utils';

export interface CampoTalleRemeraProps {
  /** `''` = todavía no eligió. */
  valor: TalleRemera | '';
  onCambiar: (valor: TalleRemera | '') => void;
  onSalir?: () => void;
  etiqueta: string;
  /** La primera opción, vacía ("Elegí un talle"). */
  placeholder: string;
  ayuda?: string;
  error?: string;
  disabled?: boolean;
  /** Arma `campo-<nombre>` (H-50: el resumen de errores enlaza a ese id). */
  nombre?: string;
  className?: string;
}

/**
 * D229: "¿Qué talle de remera usás?" — un `<select>` nativo (el más
 * accesible en el celular y con lector de pantalla), con la letra de 16 px y
 * los 44 px de alto de D150, y su error debajo con la pieza de H-50. Una sola
 * pieza para la web (Mi camino) y el backoffice (en nombre de, y corregir el
 * talle en el detalle), Principio XI.
 */
export function CampoTalleRemera({
  valor,
  onCambiar,
  onSalir,
  etiqueta,
  placeholder,
  ayuda,
  error,
  disabled,
  nombre = 'talleRemera',
  className,
}: CampoTalleRemeraProps) {
  const id = `campo-${nombre}`;
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <label htmlFor={id} className="text-base font-medium">
        {etiqueta}
      </label>
      {ayuda && (
        <p id={`${id}-ayuda`} className="text-base text-muted-foreground">
          {ayuda}
        </p>
      )}
      <select
        id={id}
        name={nombre}
        value={valor}
        required
        disabled={disabled}
        onChange={(e) => onCambiar(e.target.value as TalleRemera | '')}
        onBlur={onSalir}
        aria-invalid={error ? true : undefined}
        aria-describedby={cn(ayuda && `${id}-ayuda`, error && `${id}-error`) || undefined}
        className="h-11 w-full rounded-lg border border-input bg-transparent px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30"
      >
        <option value="">{placeholder}</option>
        {TALLES_REMERA.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>
      <MensajeErrorCampo id={`${id}-error`} mensaje={error} />
    </div>
  );
}
