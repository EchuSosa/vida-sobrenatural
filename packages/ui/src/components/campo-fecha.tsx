'use client';

import * as React from 'react';
import { useRef, useState } from 'react';

/**
 * H-R10 (revisión manual de la 004): campo de fecha propio — Día, Mes y Año —
 * en lugar de `<input type="date">`. El control nativo de WebKit (Safari y
 * todos los navegadores de iPhone) no le entrega el valor a la página mientras
 * el campo está vacío y se completa por partes, muestra la fecha de hoy en un
 * campo vacío, obliga a retroceder mes por mes para llegar a un año de
 * nacimiento y abre un calendario que queda cortado al pie de la pantalla.
 * Tres casillas se ven y andan igual en todos los navegadores: el año se
 * escribe, el vacío se ve vacío y no hay calendario que se corte.
 *
 * El valor es el mismo que el de `type="date"`: `AAAA-MM-DD`, o `''` mientras
 * falte una parte o la fecha no exista (31 de febrero). La pantalla valida
 * `''` como hoy ("completá día, mes y año"). Todo texto llega por prop (D84).
 */
export interface EtiquetasCampoFecha {
  dia: string;
  mes: string;
  anio: string;
  /** Los doce meses, de enero a diciembre. */
  meses: string[];
}

export interface CampoFechaProps {
  /** Va en la casilla del día: es a donde enlaza `ResumenErrores` (`#campo-…`). */
  id: string;
  /** El nombre del campo ("Fecha de nacimiento", "Desde"): la leyenda del grupo. */
  etiqueta: string;
  value: string;
  onChange: (valor: string) => void;
  /** Al salir del grupo entero, no de cada casilla (H-72: no avisar a mitad de camino). */
  onBlur?: () => void;
  etiquetas: EtiquetasCampoFecha;
  error?: boolean;
  /** `id` del mensaje de error del campo, para `aria-describedby`. */
  idError?: string;
  disabled?: boolean;
  required?: boolean;
  /** Fecha de nacimiento: el navegador la puede completar sola (bday-day/-month/-year). */
  autoCompletarNacimiento?: boolean;
  className?: string;
}

interface Partes {
  dia: string;
  mes: string;
  anio: string;
}

/** `AAAA-MM-DD` → sus partes, sin ceros a la izquierda en el día (así se escribe). */
export function partirFecha(valor: string): Partes {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
  if (!m) return { dia: '', mes: '', anio: '' };
  return { dia: String(Number(m[3])), mes: String(Number(m[2])), anio: m[1] };
}

/** Las tres partes → `AAAA-MM-DD`, o `''` si falta algo o la fecha no existe. */
export function componerFecha({ dia, mes, anio }: Partes): string {
  if (!/^\d{1,2}$/.test(dia) || !/^\d{1,2}$/.test(mes) || !/^\d{4}$/.test(anio)) return '';
  const d = Number(dia);
  const m = Number(mes);
  const a = Number(anio);
  if (m < 1 || m > 12 || d < 1) return '';
  const diasDelMes = new Date(Date.UTC(a, m, 0)).getUTCDate();
  if (d > diasDelMes) return '';
  return `${anio}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

const CLASE = 'h-11 rounded-md border border-input bg-transparent px-2 text-base font-normal aria-invalid:border-destructive disabled:opacity-50 sm:text-sm tactil:sm:text-base dark:bg-input/30';

export function CampoFecha({ id, etiqueta, value, onChange, onBlur, etiquetas, error, idError, disabled, required, autoCompletarNacimiento, className }: CampoFechaProps) {
  const [partes, setPartes] = useState<Partes>(() => partirFecha(value));
  // Lo último que se le avisó a la pantalla. Si `value` cambia por otro lado
  // (la pantalla vacía el formulario después de guardar, o carga otro
  // registro), las casillas se reacomodan; si es el `''` de una fecha a medio
  // escribir que avisamos nosotros, las casillas se quedan como están.
  const [avisado, setAvisado] = useState(value);
  if (value !== avisado) {
    setAvisado(value);
    setPartes(partirFecha(value));
  }
  const grupo = useRef<HTMLFieldSetElement>(null);

  function cambiar(parte: keyof Partes, texto: string) {
    const nuevas = { ...partes, [parte]: texto };
    setPartes(nuevas);
    const valor = componerFecha(nuevas);
    setAvisado(valor);
    if (valor !== value) onChange(valor);
  }

  const aria = {
    'aria-invalid': error || undefined,
    'aria-describedby': error && idError ? idError : undefined,
  } as const;

  return (
    <fieldset
      ref={grupo}
      className={`flex min-w-0 flex-col gap-1 ${className ?? ''}`}
      onBlur={(e) => {
        if (onBlur && !grupo.current?.contains(e.relatedTarget as Node | null)) onBlur();
      }}
    >
      <legend className="mb-1 text-sm font-medium tactil:text-base">{etiqueta}</legend>
      <div className="flex gap-2">
        <div className="flex flex-col gap-1">
          <label htmlFor={id} className="text-xs text-muted-foreground tactil:text-sm">
            {etiquetas.dia}
          </label>
          <input
            id={id}
            inputMode="numeric"
            autoComplete={autoCompletarNacimiento ? 'bday-day' : 'off'}
            maxLength={2}
            value={partes.dia}
            disabled={disabled}
            required={required}
            onChange={(e) => cambiar('dia', e.target.value.replace(/\D/g, ''))}
            className={`${CLASE} w-14 text-center`}
            {...aria}
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <label htmlFor={`${id}-mes`} className="text-xs text-muted-foreground tactil:text-sm">
            {etiquetas.mes}
          </label>
          <select
            id={`${id}-mes`}
            autoComplete={autoCompletarNacimiento ? 'bday-month' : 'off'}
            value={partes.mes}
            disabled={disabled}
            required={required}
            onChange={(e) => cambiar('mes', e.target.value)}
            className={`${CLASE} min-w-0`}
            {...aria}
          >
            <option value="" />
            {etiquetas.meses.map((nombre, i) => (
              <option key={nombre} value={String(i + 1)}>
                {nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={`${id}-anio`} className="text-xs text-muted-foreground tactil:text-sm">
            {etiquetas.anio}
          </label>
          <input
            id={`${id}-anio`}
            inputMode="numeric"
            autoComplete={autoCompletarNacimiento ? 'bday-year' : 'off'}
            maxLength={4}
            value={partes.anio}
            disabled={disabled}
            required={required}
            onChange={(e) => cambiar('anio', e.target.value.replace(/\D/g, ''))}
            className={`${CLASE} w-20 text-center`}
            {...aria}
          />
        </div>
      </div>
    </fieldset>
  );
}
