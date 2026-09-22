'use client';

import { MensajeErrorCampo } from '@vida-sobrenatural/ui';

/** H-44: movidos tal cual desde formulario-registro.tsx, sin cambios — campos compartidos entre los pasos 1 a 3. */

export function Campo({
  label,
  name,
  type = 'text',
  required,
  value,
  onChange,
  onBlur,
  error,
  errorTexto,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  /** H-72: revalida al salir del campo. */
  onBlur?: () => void;
  error?: boolean;
  errorTexto: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium">
      {label}
      <input
        id={`campo-${name}`}
        name={name}
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        aria-invalid={error || undefined}
        aria-describedby={error ? `campo-${name}-error` : undefined}
        className="h-10 rounded-md border border-input bg-transparent px-3 text-sm font-normal aria-invalid:border-destructive dark:bg-input/30"
      />
      {error && <MensajeErrorCampo id={`campo-${name}-error`} mensaje={errorTexto} />}
    </label>
  );
}

export function CampoSelect({
  label,
  name,
  required,
  opciones,
  value,
  onChange,
  onBlur,
  error,
  errorTexto,
  placeholder,
}: {
  label: string;
  name: string;
  required?: boolean;
  opciones: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  /** H-72: revalida al salir del campo. */
  onBlur?: () => void;
  error?: boolean;
  errorTexto: string;
  placeholder: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium">
      {label}
      <select
        id={`campo-${name}`}
        name={name}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        aria-invalid={error || undefined}
        aria-describedby={error ? `campo-${name}-error` : undefined}
        className="h-10 rounded-md border border-input bg-transparent px-3 text-sm font-normal aria-invalid:border-destructive dark:bg-input/30"
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {opciones.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error && <MensajeErrorCampo id={`campo-${name}-error`} mensaje={errorTexto} />}
    </label>
  );
}
