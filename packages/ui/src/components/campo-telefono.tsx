/**
 * Input de teléfono estructurado (código de país + número) — D90. Extraído
 * de apps/web/src/app/(publica)/registro/page.tsx (H-30, revisión manual,
 * actualización 2026-09-20) para reutilizarlo también en Sede
 * (apps/backoffice) y en el self-edit de Perfil (apps/web, H-28) sin
 * duplicar el mismo componente en las dos apps.
 */
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
          className="h-10 w-40 shrink-0 rounded-md border border-zinc-300 px-2 text-sm font-normal dark:border-zinc-700 dark:bg-zinc-900"
        >
          {OPCIONES_CODIGO_PAIS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <input
          name="telefonoNumero"
          type="tel"
          inputMode="numeric"
          required={requerido}
          aria-label={labelTelefono}
          aria-invalid={error || undefined}
          value={numero}
          placeholder={placeholderNumero}
          onChange={(e) => onChangeNumero(e.target.value.replace(/[^0-9]/g, ''))}
          className="h-10 flex-1 rounded-md border border-zinc-300 px-3 text-sm font-normal aria-invalid:border-destructive dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>
      {error && errorTexto && <span className="text-sm font-normal text-destructive">{errorTexto}</span>}
    </div>
  );
}
