'use client';

import { MensajeErrorCampo } from '@vida-sobrenatural/ui';

/**
 * H-44: campos compartidos entre los pasos 1 a 3. ajustes-ux #29/#30 (D150):
 * 44 px de alto y 16 px de letra en etiqueta y valor. #32: `ayuda`, una línea
 * debajo de la etiqueta cuando el dato no es obvio (docs/15 "Formularios"),
 * asociada al campo con `aria-describedby`.
 */
function describedBy(name: string, error?: boolean, ayuda?: string) {
  const ids = [ayuda ? `campo-${name}-ayuda` : null, error ? `campo-${name}-error` : null].filter(Boolean);
  return ids.length ? ids.join(' ') : undefined;
}

function Ayuda({ name, texto }: { name: string; texto?: string }) {
  if (!texto) return null;
  return (
    <span id={`campo-${name}-ayuda`} className="text-base font-normal text-muted-foreground">
      {texto}
    </span>
  );
}

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
  ayuda,
}: {
  label: string;
  name: string;
  ayuda?: string;
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
    <div className="flex flex-col gap-1">
      <label htmlFor={`campo-${name}`} className="text-base font-medium">
        {label}
      </label>
      <Ayuda name={name} texto={ayuda} />
      <input
        id={`campo-${name}`}
        name={name}
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        aria-invalid={error || undefined}
        aria-describedby={describedBy(name, error, ayuda)}
        className="h-11 rounded-md border border-input bg-transparent px-3 text-base font-normal aria-invalid:border-destructive dark:bg-input/30"
      />
      {error && <MensajeErrorCampo id={`campo-${name}-error`} mensaje={errorTexto} />}
    </div>
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
  ayuda,
}: {
  label: string;
  name: string;
  ayuda?: string;
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
    <div className="flex flex-col gap-1">
      <label htmlFor={`campo-${name}`} className="text-base font-medium">
        {label}
      </label>
      <Ayuda name={name} texto={ayuda} />
      <select
        id={`campo-${name}`}
        name={name}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        aria-invalid={error || undefined}
        aria-describedby={describedBy(name, error, ayuda)}
        className="h-11 rounded-md border border-input bg-transparent px-3 text-base font-normal aria-invalid:border-destructive dark:bg-input/30"
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
    </div>
  );
}
