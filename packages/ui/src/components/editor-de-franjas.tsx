'use client';

import { useState } from 'react';
import type { Franja } from '@vida-sobrenatural/shared-types';
import { Button } from './ui/button';

/**
 * specs/004-vida-nueva-discipulado (T012a, Echo 2026-09-28): editor de franjas
 * horarias — selector de día de la semana + hora de inicio + hora de fin (24 h),
 * con la lista de franjas cargadas y "quitar" por franja. Sin grilla: anda con
 * teclado y en celular (`<input type="time">`, objetivos de 44px). Lo usan Mi
 * camino (apps/web), Mi disponibilidad y "pedir en nombre de" (apps/backoffice),
 * así que vive en packages/ui (Principio XI). Todo texto llega por prop, incluidos
 * los días (H-151/D84): el componente no sabe español.
 */
export interface EtiquetasEditorFranjas {
  /** Los siete días, de domingo (0) a sábado (6). */
  dias: [string, string, string, string, string, string, string];
  dia: string;
  desde: string;
  hasta: string;
  agregar: string;
  quitar: string;
  sinFranjas: string;
  /** Se muestra cuando la hora de fin no es posterior a la de inicio (FR-017). */
  errorRango: string;
  /** Cómo se lee una franja ya cargada, ej. "Martes 19:00 a 21:00". `separador` = " a ". */
  separador: string;
}

export interface EditorDeFranjasProps {
  value: Franja[];
  onChange: (franjas: Franja[]) => void;
  etiquetas: EtiquetasEditorFranjas;
  /** Prefijo de los `id`/`htmlFor`, para que dos editores en la misma página no choquen. */
  idBase?: string;
  disabled?: boolean;
}

function aMinutos(hhmm: string): number | null {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm);
  if (!m) return null;
  const min = Number(m[1]) * 60 + Number(m[2]);
  return min >= 0 && min <= 1440 ? min : null;
}

/** Minutos desde las 0:00 → "HH:mm" (24 h). */
export function minutosAHHMM(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function EditorDeFranjas({ value, onChange, etiquetas, idBase = 'franja', disabled }: EditorDeFranjasProps) {
  const [dia, setDia] = useState(2);
  const [desde, setDesde] = useState('19:00');
  const [hasta, setHasta] = useState('21:00');
  const [error, setError] = useState<string | null>(null);

  const idDia = `${idBase}-dia`;
  const idDesde = `${idBase}-desde`;
  const idHasta = `${idBase}-hasta`;
  const idError = `${idBase}-error`;

  function agregar() {
    const inicio = aMinutos(desde);
    const fin = aMinutos(hasta);
    if (inicio === null || fin === null || fin <= inicio) {
      setError(etiquetas.errorRango);
      return;
    }
    setError(null);
    onChange([...value, { diaSemana: dia, inicio, fin }]);
  }

  return (
    <div className="flex flex-col gap-3">
      {value.length === 0 ? (
        <p className="text-sm text-muted-foreground">{etiquetas.sinFranjas}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {value.map((f, i) => (
            <li key={`${f.diaSemana}-${f.inicio}-${f.fin}-${i}`} className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm">
              <span>
                {etiquetas.dias[f.diaSemana]} {minutosAHHMM(f.inicio)}
                {etiquetas.separador}
                {minutosAHHMM(f.fin)}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={disabled}
                onClick={() => onChange(value.filter((_, j) => j !== i))}
              >
                {etiquetas.quitar}
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1 text-sm font-medium">
          <label htmlFor={idDia}>{etiquetas.dia}</label>
          <select
            id={idDia}
            value={dia}
            disabled={disabled}
            onChange={(e) => setDia(Number(e.target.value))}
            className="h-11 rounded-md border border-input bg-transparent px-2 text-sm font-normal dark:bg-input/30"
          >
            {etiquetas.dias.map((nombre, i) => (
              <option key={i} value={i}>
                {nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1 text-sm font-medium">
          <label htmlFor={idDesde}>{etiquetas.desde}</label>
          <input
            id={idDesde}
            type="time"
            value={desde}
            disabled={disabled}
            onChange={(e) => setDesde(e.target.value)}
            className="h-11 rounded-md border border-input bg-transparent px-2 text-sm font-normal dark:bg-input/30"
          />
        </div>
        <div className="flex flex-col gap-1 text-sm font-medium">
          <label htmlFor={idHasta}>{etiquetas.hasta}</label>
          <input
            id={idHasta}
            type="time"
            value={hasta}
            disabled={disabled}
            onChange={(e) => setHasta(e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? idError : undefined}
            className="h-11 rounded-md border border-input bg-transparent px-2 text-sm font-normal dark:bg-input/30"
          />
        </div>
        <Button type="button" variant="outline" disabled={disabled} onClick={agregar} className="h-11">
          {etiquetas.agregar}
        </Button>
      </div>
      {error && (
        <p id={idError} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
