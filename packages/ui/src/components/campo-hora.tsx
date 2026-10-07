'use client';

import * as React from 'react';

/**
 * H-R10 y H-R9 (revisión manual de la 004): campo de hora propio — Hora y
 * Minutos, dos listas — en lugar de `<input type="time">`. El control nativo
 * de WebKit no le entrega el valor a la página de forma confiable (ver
 * campo-fecha.tsx) y cada navegador elige su formato: la lista de franjas
 * decía "19:00" y el campo "07:00 p.m.". Con dos listas es siempre 24 h y
 * anda igual en todos lados. Los minutos van de a 15; si un valor ya
 * guardado tiene otros minutos (anteriores a este campo), se muestra igual.
 *
 * El valor es `HH:mm`, como el de `type="time"`. Todo texto por prop (D84).
 */
export interface EtiquetasCampoHora {
  hora: string;
  minutos: string;
}

export interface CampoHoraProps {
  /** Va en la lista de la hora: es a donde enlaza `ResumenErrores` (`#campo-…`). */
  id: string;
  /** El nombre del campo ("Desde", "Hasta"): la leyenda del grupo. */
  etiqueta: string;
  value: string;
  onChange: (valor: string) => void;
  etiquetas: EtiquetasCampoHora;
  error?: boolean;
  idError?: string;
  disabled?: boolean;
}

const HORAS = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, '0'));
const MINUTOS = ['00', '15', '30', '45'];

const CLASE = 'h-11 rounded-md border border-input bg-transparent px-2 text-base font-normal aria-invalid:border-destructive disabled:opacity-50 sm:text-sm dark:bg-input/30';

export function CampoHora({ id, etiqueta, value, onChange, etiquetas, error, idError, disabled }: CampoHoraProps) {
  const [hora = '00', minutos = '00'] = /^\d{2}:\d{2}$/.test(value) ? value.split(':') : [];
  const opcionesMinutos = MINUTOS.includes(minutos) ? MINUTOS : [...MINUTOS, minutos].sort();
  const aria = {
    'aria-invalid': error || undefined,
    'aria-describedby': error && idError ? idError : undefined,
  } as const;

  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="mb-1 text-sm font-medium">{etiqueta}</legend>
      <div className="flex items-center gap-1">
        <select
          id={id}
          aria-label={etiquetas.hora}
          value={hora}
          disabled={disabled}
          onChange={(e) => onChange(`${e.target.value}:${minutos}`)}
          className={CLASE}
          {...aria}
        >
          {HORAS.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
        <span aria-hidden="true">:</span>
        <select
          id={`${id}-minutos`}
          aria-label={etiquetas.minutos}
          value={minutos}
          disabled={disabled}
          onChange={(e) => onChange(`${hora}:${e.target.value}`)}
          className={CLASE}
          {...aria}
        >
          {opcionesMinutos.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>
    </fieldset>
  );
}
