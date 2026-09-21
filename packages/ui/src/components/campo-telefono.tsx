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

export function CampoTelefono({
  id,
  labelTelefono,
  labelCodigo,
  codigoPais,
  numero,
  onChangeCodigo,
  onChangeNumero,
  error,
  errorTexto,
  placeholderNumero,
  requerido = true,
}: {
  /** H-50: id del input de número — permite que un `<ResumenErrores>` enlace y enfoque este campo. */
  id?: string;
  labelTelefono: string;
  labelCodigo: string;
  codigoPais: string;
  numero: string;
  onChangeCodigo: (value: string) => void;
  onChangeNumero: (value: string) => void;
  error?: boolean;
  errorTexto?: string;
  placeholderNumero?: string;
  requerido?: boolean;
}) {
  const idError = id ? `${id}-error` : undefined;
  const mostrarNombrePais = usePantallaDesdeSm();
  return (
    <div className="flex flex-col gap-1 text-sm font-medium">
      {labelTelefono}
      <div className="flex gap-2">
        <select
          name="telefonoCodigoPais"
          required={requerido}
          value={codigoPais}
          onChange={(e) => onChangeCodigo(e.target.value)}
          aria-label={labelCodigo}
          className="h-10 w-24 shrink-0 rounded-md border border-input bg-transparent px-2 text-sm font-normal dark:bg-input/30 sm:w-40"
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
          aria-describedby={error && idError ? idError : undefined}
          value={numero}
          placeholder={placeholderNumero}
          onChange={(e) => onChangeNumero(e.target.value.replace(/[^0-9]/g, ''))}
          className="h-10 min-w-0 flex-1 rounded-md border border-input bg-transparent px-3 text-sm font-normal aria-invalid:border-destructive dark:bg-input/30"
        />
      </div>
      {error && errorTexto && (
        <span id={idError} className="text-sm font-normal text-destructive">
          {errorTexto}
        </span>
      )}
    </div>
  );
}
