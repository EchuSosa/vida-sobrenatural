'use client';

import { useRef } from 'react';
import { MarkdownSeguro } from './markdown-seguro';
import { cn } from '../lib/utils';

/**
 * H-90/D127: editor de Markdown, no un WYSIWYG que emita HTML — un
 * `<textarea>` con una barra que inserta la sintaxis (no una toolbar que
 * arma HTML por atrás) y una vista previa que usa el MISMO renderizador
 * restringido que va a usar la página pública (`MarkdownSeguro`, acá
 * abajo) — así quien escribe ve exactamente lo que se va a publicar, sin
 * mantener dos implementaciones de "cómo se ve esto" por separado.
 */

interface AccionBarra {
  etiqueta: string;
  aplicar: (seleccion: string) => { texto: string; cursorTrasInsercion?: number };
}

export interface EtiquetasEditorMarkdown {
  negrita: string;
  italica: string;
  enlace: string;
  lista: string;
  h2: string;
  h3: string;
  vistaPrevia: string;
  /** Texto de reemplazo cuando se aplica "enlace"/"negrita"/etc. sin nada seleccionado. */
  textoPorDefectoEnlace: string;
  urlPorDefectoEnlace: string;
}

export interface EditorMarkdownProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  ariaInvalid?: boolean;
  ariaDescribedby?: string;
  className?: string;
  etiquetas: EtiquetasEditorMarkdown;
  rows?: number;
}

export function EditorMarkdown({
  id,
  value,
  onChange,
  onBlur,
  placeholder,
  required,
  disabled,
  ariaInvalid,
  ariaDescribedby,
  className,
  etiquetas,
  rows = 8,
}: EditorMarkdownProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function envolver(marca: string): AccionBarra['aplicar'] {
    return (seleccion) => ({ texto: `${marca}${seleccion || ''}${marca}` });
  }

  function prefijarLinea(marca: string): AccionBarra['aplicar'] {
    return (seleccion) => ({ texto: `${marca}${seleccion || ''}` });
  }

  const acciones: AccionBarra[] = [
    { etiqueta: etiquetas.negrita, aplicar: envolver('**') },
    { etiqueta: etiquetas.italica, aplicar: envolver('*') },
    {
      etiqueta: etiquetas.enlace,
      aplicar: (seleccion) => ({
        texto: `[${seleccion || etiquetas.textoPorDefectoEnlace}](${etiquetas.urlPorDefectoEnlace})`,
      }),
    },
    { etiqueta: etiquetas.lista, aplicar: prefijarLinea('- ') },
    { etiqueta: etiquetas.h2, aplicar: prefijarLinea('## ') },
    { etiqueta: etiquetas.h3, aplicar: prefijarLinea('### ') },
  ];

  function aplicarAccion(accion: AccionBarra) {
    const textarea = textareaRef.current;
    if (!textarea || disabled) return;
    const inicio = textarea.selectionStart;
    const fin = textarea.selectionEnd;
    const seleccion = value.slice(inicio, fin);
    const { texto } = accion.aplicar(seleccion);
    const nuevoValor = value.slice(0, inicio) + texto + value.slice(fin);
    onChange(nuevoValor);
    // El cursor queda al final de lo insertado — requestAnimationFrame porque
    // el <textarea> todavía no tiene el valor nuevo en el mismo tick (React
    // controla `value`, el DOM se actualiza después de este render).
    requestAnimationFrame(() => {
      textarea.focus();
      const posicion = inicio + texto.length;
      textarea.setSelectionRange(posicion, posicion);
    });
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {/* Sin role="toolbar": ese patrón ARIA espera navegación con flechas
          entre los botones (roving tabindex), que acá no se implementó —
          mejor un <div> simple con botones nativos, cada uno enfocable con
          Tab, que un role a medio cumplir. */}
      <div className="flex flex-wrap gap-1">
        {acciones.map((accion) => (
          <button
            key={accion.etiqueta}
            type="button"
            disabled={disabled}
            onClick={() => aplicarAccion(accion)}
            className="rounded-md border border-input bg-transparent px-2 py-1 text-xs font-medium hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
          >
            {accion.etiqueta}
          </button>
        ))}
      </div>
      <textarea
        ref={textareaRef}
        id={id}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        rows={rows}
        aria-invalid={ariaInvalid || undefined}
        aria-describedby={ariaDescribedby}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className="rounded-md border border-input bg-transparent px-3 py-2 font-mono text-sm aria-invalid:border-destructive dark:bg-input/30"
      />
      <div className="flex flex-col gap-1 rounded-md border border-border p-3">
        <span className="text-xs font-medium text-muted-foreground">{etiquetas.vistaPrevia}</span>
        <MarkdownSeguro texto={value} />
      </div>
    </div>
  );
}
