'use client';

import { Autocomplete } from '@base-ui/react/autocomplete';
import { cn } from '../lib/utils';

/**
 * H-91 (revisión manual): campo de texto libre que SUGIERE valores ya
 * cargados mientras se escribe — no un selector. Nace para "autor/a" de
 * Libro (evitar "J. Pérez"/"Juan Perez"/"juan pérez" como tres personas
 * distintas sin pagar el costo de un CRUD de Autores que hoy no se
 * justifica, H-91 lo descarta explícitamente para 9 libros), pero es
 * genérico (Principio XI) para cualquier campo de texto con sugerencias.
 *
 * Envuelve `Autocomplete` de Base UI (`AriaCombobox` por debajo, cumple el
 * patrón ARIA de combobox — flechas, Enter y anuncios a lectores de
 * pantalla vienen de la librería, no reinventados acá). `mode="list"`
 * (default): las sugerencias se filtran al tipear, pero el valor del input
 * nunca se sobrescribe solo — elegir una sugerencia o escribir un valor
 * nuevo pesan exactamente igual, sigue siendo texto libre.
 *
 * `etiqueta` se repite como `aria-label` del input (además del `<label
 * htmlFor>` visible que arma quien llama, mismo patrón que
 * `CampoTelefono`): mientras la lista de sugerencias está abierta, Base UI
 * le pone `aria-hidden` a todo lo que NO es el input ni el popup (para que
 * un lector de pantalla no se tropiece con el resto de la pantalla) — y el
 * `<label>` externo, al ser hermano del input y no ancestro, cae ahí
 * adentro. Sin el `aria-label` acá, el campo se queda sin nombre accesible
 * cada vez que se abre la lista (encontrado por un test e2e con axe, no a
 * ojo).
 */

export interface CampoAutocompletadoProps {
  id?: string;
  /** Mismo texto que el `<label htmlFor>` visible — ver comentario de arriba sobre por qué hace falta repetirlo. */
  etiqueta: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  /** Valores ya cargados para sugerir — no una lista cerrada de opciones válidas. */
  sugerencias: string[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  ariaInvalid?: boolean;
  ariaDescribedby?: string;
  className?: string;
  /**
   * Anunciado a lectores de pantalla cuando ninguna sugerencia coincide
   * (`Autocomplete.Empty`) — sin default acá (D84: los textos de interfaz
   * salen de next-intl / de la pantalla que llama, no se fijan en
   * packages/ui; mismo criterio que `mensajeVacio` de `TablaDatos`).
   */
  mensajeVacio: string;
}

export function CampoAutocompletado({
  id,
  etiqueta,
  value,
  onChange,
  onBlur,
  sugerencias,
  placeholder,
  required,
  disabled,
  ariaInvalid,
  ariaDescribedby,
  className,
  mensajeVacio,
}: CampoAutocompletadoProps) {
  return (
    <Autocomplete.Root
      items={sugerencias}
      value={value}
      onValueChange={(valor) => onChange(valor)}
      openOnInputClick
      disabled={disabled}
    >
      <Autocomplete.Input
        id={id}
        aria-label={etiqueta}
        required={required}
        onBlur={onBlur}
        aria-invalid={ariaInvalid || undefined}
        aria-describedby={ariaDescribedby}
        placeholder={placeholder}
        className={cn(
          'rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none tactil:min-h-11 tactil:text-base aria-invalid:border-destructive dark:bg-input/30',
          className,
        )}
      />
      <Autocomplete.Portal>
        <Autocomplete.Positioner className="isolate z-50 outline-none" sideOffset={4}>
          <Autocomplete.Popup className="max-h-64 w-(--anchor-width) overflow-x-hidden overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
            <Autocomplete.Empty className="px-2 py-1.5 text-sm text-muted-foreground">
              {mensajeVacio}
            </Autocomplete.Empty>
            <Autocomplete.List>
              {(item: string) => (
                <Autocomplete.Item
                  key={item}
                  value={item}
                  className="cursor-default rounded-md px-2 py-1.5 text-sm outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                >
                  {item}
                </Autocomplete.Item>
              )}
            </Autocomplete.List>
          </Autocomplete.Popup>
        </Autocomplete.Positioner>
      </Autocomplete.Portal>
    </Autocomplete.Root>
  );
}
