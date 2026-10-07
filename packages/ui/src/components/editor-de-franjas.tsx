'use client';

import { useState } from 'react';
import { problemaDeFranjaNueva, type Franja } from '@vida-sobrenatural/shared-types';
import { Button } from './ui/button';
import { CampoHora } from './campo-hora';

/**
 * specs/004-vida-nueva-discipulado (T012a, Echo 2026-09-28): editor de franjas
 * horarias — selector de día de la semana + hora de inicio + hora de fin (24 h),
 * con la lista de franjas cargadas y "quitar" por franja. Sin grilla: anda con
 * teclado y en celular (objetivos de 44px). La hora es `CampoHora` (H-R10/H-R9:
 * dos listas, 24 h, igual en Safari), no `<input type="time">`. Lo usan Mi
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
  /** Nombres accesibles de las dos listas de cada hora (CampoHora). */
  hora: string;
  minutos: string;
  agregar: string;
  quitar: string;
  sinFranjas: string;
  /** Se muestra cuando la hora de fin no es posterior a la de inicio (FR-017). */
  errorRango: string;
  /** FR-017a (H-R7/H-R8): menos de 60 minutos, igual a otra ya cargada, o que pisa otra del mismo día. */
  errorMuyCorta: string;
  errorRepetida: string;
  errorSuperpuesta: string;
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
  /**
   * Avisa cuando aparece o se va un error de la franja nueva (el texto, o
   * `null`), para que la pantalla lo sume a su `ResumenErrores` (H-50). El
   * campo con error es `${idBase}-${campo}`: `hasta` si la hora de fin no
   * sirve (rango, muy corta), `desde` si choca con otra franja.
   */
  onErrorChange?: (error: string | null, campo: 'desde' | 'hasta') => void;
  /** Mientras la pantalla guarda la franja nueva: "Agregar" en estado de carga (H-57). */
  enviando?: boolean;
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

export function EditorDeFranjas({ value, onChange, etiquetas, idBase = 'franja', disabled, onErrorChange, enviando }: EditorDeFranjasProps) {
  const [dia, setDia] = useState(2);
  const [desde, setDesde] = useState('19:00');
  const [hasta, setHasta] = useState('21:00');
  const [error, setErrorLocal] = useState<string | null>(null);
  const [campoConError, setCampoConError] = useState<'desde' | 'hasta'>('hasta');

  function setError(nuevo: string | null, campo: 'desde' | 'hasta' = 'hasta') {
    setErrorLocal(nuevo);
    setCampoConError(campo);
    onErrorChange?.(nuevo, campo);
  }

  const idDia = `${idBase}-dia`;
  const idDesde = `${idBase}-desde`;
  const idHasta = `${idBase}-hasta`;
  const idError = `${idBase}-error`;
  const etiquetasHora = { hora: etiquetas.hora, minutos: etiquetas.minutos };

  function agregar() {
    const inicio = aMinutos(desde);
    const fin = aMinutos(hasta);
    if (inicio === null || fin === null || fin <= inicio) {
      setError(etiquetas.errorRango);
      return;
    }
    const nueva = { diaSemana: dia, inicio, fin };
    const problema = problemaDeFranjaNueva(nueva, value);
    if (problema === 'FRANJA_MUY_CORTA') return setError(etiquetas.errorMuyCorta, 'hasta');
    if (problema === 'FRANJA_REPETIDA') return setError(etiquetas.errorRepetida, 'desde');
    if (problema === 'FRANJA_SUPERPUESTA') return setError(etiquetas.errorSuperpuesta, 'desde');
    setError(null);
    onChange([...value, nueva]);
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
                // D81: objetivo táctil de 44 px también en "Quitar" (T012a).
                className="h-11 min-w-11"
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
        <CampoHora
          id={idDesde}
          etiqueta={etiquetas.desde}
          value={desde}
          onChange={setDesde}
          etiquetas={etiquetasHora}
          disabled={disabled}
          error={Boolean(error) && campoConError === 'desde'}
          idError={idError}
        />
        <CampoHora
          id={idHasta}
          etiqueta={etiquetas.hasta}
          value={hasta}
          onChange={setHasta}
          etiquetas={etiquetasHora}
          disabled={disabled}
          error={Boolean(error) && campoConError === 'hasta'}
          idError={idError}
        />
        <Button type="button" variant="outline" disabled={disabled} loading={enviando} onClick={agregar} className="h-11">
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
