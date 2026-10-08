'use client';

import { useEffect, useState } from 'react';

/**
 * Input de teléfono estructurado (código de país + número) — D90. Extraído
 * de apps/web/src/app/(publica)/registro/page.tsx (H-30, revisión manual,
 * actualización 2026-09-20) para reutilizarlo también en Sede
 * (apps/backoffice) y en el self-edit de Perfil (apps/web, H-28) sin
 * duplicar el mismo componente en las dos apps.
 */

/**
 * H-62 (revisión manual ronda 5): en celular el selector muestra solo el
 * código (`+54`); el nombre del país recién aparece desde `sm` (640px). Un
 * <select> nativo no puede cambiar el texto de sus <option> por media query
 * en CSS puro — el texto visible es el de la <option> elegida — así que el
 * breakpoint se resuelve en JS. Arranca en `false` (solo código):
 * mobile-first, sin parpadeo en el caso más común.
 */
function usePantallaDesdeSm() {
  const [enSm, setEnSm] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia('(min-width: 640px)');
    const leer = () => setEnSm(mql.matches);
    leer();
    mql.addEventListener('change', leer);
    return () => mql.removeEventListener('change', leer);
  }, []);

  return enSm;
}

export const OPCIONES_CODIGO_PAIS = [
  { value: '+54', label: '+54 Argentina' },
  { value: '+598', label: '+598 Uruguay' },
  { value: '+595', label: '+595 Paraguay' },
  { value: '+591', label: '+591 Bolivia' },
  { value: '+56', label: '+56 Chile' },
  { value: '+55', label: '+55 Brasil' },
  { value: '+51', label: '+51 Perú' },
  { value: '+57', label: '+57 Colombia' },
  { value: '+58', label: '+58 Venezuela' },
  { value: '+52', label: '+52 México' },
  { value: '+34', label: '+34 España' },
  { value: '+1', label: '+1 Estados Unidos / Canadá' },
];

/**
 * Un teléfono guardado ("+54 9 221 555 0101") separado en código de país y
 * número para volver a mostrarlo en este campo. El código es el más largo de
 * `OPCIONES_CODIGO_PAIS` con el que empieza (así "+5492215550101", sin
 * espacio, no se parte en "+5492"); si no coincide ninguno, "+54" y el
 * número entero. El número queda solo con dígitos.
 */
export function separarTelefono(telefono: string): { codigoPais: string; numero: string } {
  const limpio = telefono.trim();
  const codigo = OPCIONES_CODIGO_PAIS.map((o) => o.value)
    .filter((c) => limpio.startsWith(c))
    .sort((a, b) => b.length - a.length)[0];
  if (!codigo) return { codigoPais: '+54', numero: limpio.replace(/\D/g, '') };
  return { codigoPais: codigo, numero: limpio.slice(codigo.length).replace(/\D/g, '') };
}

export function CampoTelefono({
  id,
  labelTelefono,
  labelCodigo,
  codigoPais,
  numero,
  onChangeCodigo,
  onChangeNumero,
  onBlurNumero,
  error,
  errorTexto,
  placeholderNumero,
  requerido = true,
  ayuda,
}: {
  /** H-50: id del input de número — permite que un `<ResumenErrores>` enlace y enfoque este campo. */
  id?: string;
  labelTelefono: string;
  labelCodigo: string;
  codigoPais: string;
  numero: string;
  onChangeCodigo: (value: string) => void;
  onChangeNumero: (value: string) => void;
  /** H-72: revalidar al salir del campo — el código de país no lo necesita (siempre válido, es un <select>). */
  onBlurNumero?: () => void;
  error?: boolean;
  errorTexto?: string;
  placeholderNumero?: string;
  requerido?: boolean;
  /** ajustes-ux #32/#55: una línea de ayuda debajo de la etiqueta (por qué pedimos el dato, cómo escribirlo). */
  ayuda?: string;
}) {
  const idError = id ? `${id}-error` : undefined;
  const idAyuda = id && ayuda ? `${id}-ayuda` : undefined;
  const descripcion = [idAyuda, error ? idError : undefined].filter(Boolean).join(' ') || undefined;
  const mostrarNombrePais = usePantallaDesdeSm();
  return (
    <div className="flex flex-col gap-1 text-sm font-medium tactil:text-base">
      {labelTelefono}
      {ayuda && (
        <span id={idAyuda} className="text-sm font-normal text-muted-foreground tactil:text-base">
          {ayuda}
        </span>
      )}
      <div className="flex gap-2">
        <select
          name="telefonoCodigoPais"
          required={requerido}
          value={codigoPais}
          onChange={(e) => onChangeCodigo(e.target.value)}
          aria-label={labelCodigo}
          className="h-10 tactil:h-11 w-24 shrink-0 rounded-md border border-input bg-transparent px-2 text-sm font-normal tactil:text-base dark:bg-input/30 sm:w-40"
        >
          {OPCIONES_CODIGO_PAIS.map((o) => (
            <option key={o.value} value={o.value}>
              {mostrarNombrePais ? o.label : o.value}
            </option>
          ))}
        </select>
        <input
          id={id}
          name="telefonoNumero"
          type="tel"
          inputMode="numeric"
          required={requerido}
          aria-label={labelTelefono}
          aria-invalid={error || undefined}
          aria-describedby={descripcion}
          value={numero}
          placeholder={placeholderNumero}
          onChange={(e) => onChangeNumero(e.target.value.replace(/[^0-9]/g, ''))}
          onBlur={onBlurNumero}
          className="h-10 tactil:h-11 min-w-0 flex-1 rounded-md border border-input bg-transparent px-3 text-sm font-normal tactil:text-base aria-invalid:border-destructive dark:bg-input/30"
        />
      </div>
      {error && errorTexto && (
        <span id={idError} className="text-sm font-normal tactil:text-base text-destructive">
          {errorTexto}
        </span>
      )}
    </div>
  );
}
