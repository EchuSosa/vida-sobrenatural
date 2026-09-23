'use client';

import { useEffect } from 'react';
import { useEditor, useEditorState, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Markdown, type MarkdownStorage } from 'tiptap-markdown';
import { cn } from '../lib/utils';

/**
 * `tiptap-markdown` no declara `declare module '@tiptap/core' { interface
 * Storage { markdown: MarkdownStorage } }`, así que TypeScript no infiere
 * `editor.storage.markdown` solo con la extensión en el array — un único
 * cast, acá, en vez de repetirlo en cada lugar que necesita leer el
 * Markdown actual.
 */
function obtenerMarkdown(editor: Editor): string {
  return (editor.storage as unknown as { markdown: MarkdownStorage }).markdown.getMarkdown();
}

/**
 * H-90/D127 (revisión manual): reemplaza el `<textarea>` con botones que
 * insertaban sintaxis Markdown — para quien no sabe qué es Markdown (el
 * pastor), eso era peor que nada. TipTap (núcleo MIT, headless) en su
 * lugar: un editor de verdad, donde negrita se ve en negrita mientras se
 * escribe, no como `**negrita**`.
 *
 * D127 NO cambia: se sigue guardando Markdown, nunca HTML ni el JSON de
 * ProseMirror — TipTap se conecta en los bordes (`tiptap-markdown`):
 * parsea Markdown al abrir (`content={value}`, la extensión intercepta el
 * `content` inicial además de `setContent`), serializa a Markdown en cada
 * cambio (`editor.storage.markdown.getMarkdown()`). Guardar el JSON de
 * ProseMirror en cambio ataría el dato para siempre a esta librería —
 * exactamente lo que D127 evitó con react-markdown del lado del
 * renderizador (`markdown-seguro.tsx`, sin tocar).
 *
 * El conjunto de marcas es el mismo que ya fijaba D127 (negrita, itálica,
 * párrafos, listas, enlaces, h2 y h3, NUNCA h1) — pero acá se aplica en el
 * ORIGEN, no solo al renderizar: `StarterKit.configure` desactiva todo lo
 * que no está en esa lista (blockquote, code, codeBlock, horizontalRule,
 * strike, underline, listas numeradas) y `heading: { levels: [2, 3] }`
 * hace que el editor no pueda producir un h1 en absoluto — al toolbar de
 * antes le sobra "Vista previa": con TipTap el área de edición YA se ve
 * como el resultado final (estilos de `[&_h2]:...`/`[&_ul]:...` calcados
 * de la página pública, docs/17-paleta-y-tokens.md/D118) — duplicar el
 * contenido en un panel aparte confundiría más a quien no sabe qué es
 * Markdown que ayudar. `markdown-seguro.tsx` (el renderizador real de la
 * página pública) queda intacto — lo que cambió es solo cómo se escribe.
 *
 * `protocols: ['http', 'https']` en el link de TipTap es una segunda
 * barrera (además de la que ya tiene `markdown-seguro.tsx` del lado del
 * renderizador): ni siquiera se puede escribir un enlace `javascript:`
 * desde el editor.
 */

export interface EtiquetasEditorMarkdown {
  negrita: string;
  italica: string;
  enlace: string;
  lista: string;
  h2: string;
  h3: string;
  /** Texto de reemplazo cuando se aplica "enlace" sin nada seleccionado. */
  textoPorDefectoEnlace: string;
  /** Valor precargado (editable) del prompt de URL al crear un enlace. */
  urlPorDefectoEnlace: string;
}

export interface EditorMarkdownProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  ariaInvalid?: boolean;
  ariaDescribedby?: string;
  /**
   * `id` del `<label>` visible que acompaña al campo. Un `<label for>`
   * apuntando a este componente NO alcanza para el nombre accesible: `for`
   * solo asocia con los elementos "labelable" del HTML (input/textarea/
   * select/...) — un `<div contenteditable>`, aunque tenga
   * `role="textbox"`, queda afuera de esa lista en los navegadores reales
   * (verificado: Chromium lo exponía sin nombre pese al `<label for>`
   * correcto). `aria-labelledby` sí funciona para cualquier rol — pasale
   * el `id` del `<label>`, además de (no en lugar de) `htmlFor` en ese
   * `<label>`, para mantener el mismo patrón visual que el resto de los
   * campos de la app.
   */
  ariaLabelledby?: string;
  className?: string;
  etiquetas: EtiquetasEditorMarkdown;
}

interface EstadoBarra {
  negrita: boolean;
  italica: boolean;
  enlace: boolean;
  lista: boolean;
  h2: boolean;
  h3: boolean;
}

interface AccionBarra {
  etiqueta: string;
  clave: keyof EstadoBarra;
  onClick: (editor: Editor) => void;
}

export function EditorMarkdown({
  id,
  value,
  onChange,
  onBlur,
  placeholder,
  disabled,
  ariaInvalid,
  ariaDescribedby,
  ariaLabelledby,
  className,
  etiquetas,
}: EditorMarkdownProps) {
  const editor = useEditor({
    // SSR (Next.js): crear el editor recién en el cliente, después del
    // montaje — evita el warning/mismatch de hidratación de TipTap.
    immediatelyRender: false,
    editable: !disabled,
    content: value,
    extensions: [
      StarterKit.configure({
        // Todo lo que sigue en `false` es a propósito: nada de esto está
        // en el conjunto que fija D127, y dejarlo prendido en el editor
        // (aunque markdown-seguro.tsx después lo ignore al renderizar)
        // produciría el peor caso posible: se ve bien mientras se
        // escribe, y desaparece o se aplana al publicar.
        blockquote: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
        strike: false,
        underline: false,
        orderedList: false,
        heading: { levels: [2, 3] },
        link: {
          openOnClick: false,
          autolink: true,
          linkOnPaste: true,
          // Permite escribir/pegar `[texto](url)` y que se convierta en
          // un enlace real — mismo patrón que ya podía escribirse a mano.
          markdownLinks: true,
          protocols: ['http', 'https'],
          defaultProtocol: 'https',
          HTMLAttributes: { rel: 'noopener noreferrer' },
        },
      }),
      Markdown.configure({
        html: false, // D127: nunca HTML crudo, ni de entrada ni de salida.
        linkify: false, // no autoconvertir URLs sueltas — solo `[texto](url)` explícito, mismo criterio que antes.
        // `breaks: false` (default, explícito acá): un salto de línea
        // simple NO se vuelve <br> — coincide con cómo interpreta
        // Markdown `markdown-seguro.tsx` (react-markdown/remark, sin el
        // plugin de breaks). Si difirieran, el editor mostraría saltos de
        // línea que la página pública no respetaría.
        breaks: false,
      }),
    ],
    onUpdate: ({ editor }) => onChange(obtenerMarkdown(editor)),
    onBlur: () => onBlur?.(),
    editorProps: {
      attributes: {
        // Un <div contenteditable> sin role="textbox" no se anuncia como
        // un campo editable — es texto suelto para lectores de pantalla
        // (y por eso mismo tampoco lo encuentra Playwright `getByLabel`,
        // que arma el mismo árbol de accesibilidad: el error apareció acá
        // primero, verificando el e2e, no al revés).
        role: 'textbox',
        'aria-multiline': 'true',
        ...(id ? { id } : {}),
        ...(ariaInvalid ? { 'aria-invalid': 'true' } : {}),
        ...(ariaDescribedby ? { 'aria-describedby': ariaDescribedby } : {}),
        ...(ariaLabelledby ? { 'aria-labelledby': ariaLabelledby } : {}),
        ...(placeholder ? { 'data-placeholder': placeholder } : {}),
        class: cn(
          'min-h-40 rounded-md border border-input bg-transparent px-3 py-2 text-base outline-none aria-invalid:border-destructive dark:bg-input/30',
          // Calcado de la página pública (nosotros/palabra-profetica/page.tsx)
          // para que editar y publicar se vean igual — Principio XI.
          'flex flex-col gap-4 leading-7 text-foreground [&_a]:underline [&_a]:underline-offset-4 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:text-lg [&_h3]:font-semibold [&_ul]:list-disc [&_ul]:pl-6',
          '[&_p.is-editor-empty:first-child::before]:pointer-events-none [&_p.is-editor-empty:first-child::before]:float-left [&_p.is-editor-empty:first-child::before]:h-0 [&_p.is-editor-empty:first-child::before]:text-muted-foreground [&_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]',
        ),
      },
    },
  });

  // Sincroniza cambios externos (ej. `valoresIniciales` al abrir el
  // formulario en edición) — sin este chequeo, cada tecla dispararía
  // setContent y movería el cursor al principio.
  useEffect(() => {
    if (!editor) return;
    if (obtenerMarkdown(editor) !== value) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  /**
   * `aria-pressed` (y el resaltado visual, D81/H-55) tienen que reflejar
   * la "marca guardada" para lo próximo que se escriba, no solo el
   * contenido ya escrito: activar Negrita con el cursor en un párrafo
   * vacío (antes de tipear) NO cambia el documento — solo el estado
   * interno de ProseMirror — así que `onUpdate` (que solo dispara con
   * `docChanged`) nunca se entera y el componente no se volvía a
   * renderizar: el botón quedaba con `aria-pressed="false"` a pesar de
   * que la marca SÍ estaba activa. `useEditorState` (el hook que expone
   * @tiptap/react para esto) sí se suscribe a cualquier transacción,
   * cambie o no el documento.
   */
  const estadoBarra = useEditorState({
    editor,
    selector: ({ editor }): EstadoBarra | null =>
      editor
        ? {
            negrita: editor.isActive('bold'),
            italica: editor.isActive('italic'),
            enlace: editor.isActive('link'),
            lista: editor.isActive('bulletList'),
            h2: editor.isActive('heading', { level: 2 }),
            h3: editor.isActive('heading', { level: 3 }),
          }
        : null,
  });

  const acciones: AccionBarra[] = [
    {
      etiqueta: etiquetas.negrita,
      clave: 'negrita',
      onClick: (e) => e.chain().focus().toggleBold().run(),
    },
    {
      etiqueta: etiquetas.italica,
      clave: 'italica',
      onClick: (e) => e.chain().focus().toggleItalic().run(),
    },
    {
      etiqueta: etiquetas.enlace,
      clave: 'enlace',
      onClick: (e) => alternarEnlace(e, etiquetas),
    },
    {
      etiqueta: etiquetas.lista,
      clave: 'lista',
      onClick: (e) => e.chain().focus().toggleBulletList().run(),
    },
    {
      etiqueta: etiquetas.h2,
      clave: 'h2',
      onClick: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      etiqueta: etiquetas.h3,
      clave: 'h3',
      onClick: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(),
    },
  ];

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
            disabled={disabled || !editor}
            aria-pressed={estadoBarra ? estadoBarra[accion.clave] : false}
            // Sin este preventDefault, el click del botón le saca el foco
            // (y con él la selección) al editor ANTES de que el comando
            // corra — `.chain().focus()` ya no tiene sobre qué aplicar el
            // formato. Patrón estándar de TipTap para barras de
            // herramientas.
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor && accion.onClick(editor)}
            className="rounded-md border border-input bg-transparent px-2 py-1 text-xs font-medium hover:bg-accent hover:text-accent-foreground aria-pressed:border-transparent aria-pressed:bg-primary aria-pressed:text-primary-foreground disabled:pointer-events-none disabled:opacity-50"
          >
            {accion.etiqueta}
          </button>
        ))}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}

/**
 * H-90/D127: sin selección, inserta `textoPorDefectoEnlace` ya convertido
 * en enlace (mismo comportamiento que el editor viejo insertaba como
 * placeholder de texto a mano). Con selección, la convierte en enlace.
 * `window.prompt` en vez de un diálogo propio — el editor viejo tampoco
 * tenía ninguno (insertaba sintaxis para completar a mano); esto pide lo
 * mismo, una URL, con un paso menos.
 *
 * En los dos casos, termina con el cursor COLAPSADO justo después del
 * enlace (`setTextSelection(hasta)`, sin rango) — no lo deja seleccionado.
 * Sin esto quedaba una selección abarcando todo el texto del enlace; si
 * justo después se apretaba Enter (algo tan común como seguir escribiendo
 * después de linkear), lo que se borraba era el ENLACE, no lo que
 * "debería" ser la selección — un navegador con una selección de rango
 * sobre un nodo inline que ocupa toda la línea no siempre resuelve `End`
 * como "colapsar al final" (confirmado con `window.getSelection()`: el
 * rango seguía cubriendo el enlace entero incluso bastante después de
 * `End`). Colapsar la selección acá, en el momento en que se crea el
 * enlace, no depende de qué tecla se apriete después — ni del navegador.
 */
function alternarEnlace(editor: Editor, etiquetas: EtiquetasEditorMarkdown) {
  if (editor.isActive('link')) {
    editor.chain().focus().extendMarkRange('link').unsetLink().run();
    return;
  }
  const entrada = window.prompt(`${etiquetas.enlace} — URL (http:// o https://)`, etiquetas.urlPorDefectoEnlace);
  const url = entrada?.trim();
  if (!url || !/^https?:\/\//i.test(url)) return;
  const { empty, from } = editor.state.selection;
  if (empty) {
    // Inserta el texto por defecto como texto plano primero, y recién
    // ahí selecciona ese rango para aplicarle el link — un nodo de texto
    // CON su marca en un solo paso (`insertContent` con `marks`) fallaba
    // en algunas posiciones ("Inserted content deeper than insertion
    // position", un error interno de ProseMirror) según dónde estuviera
    // el cursor; insertar y después seleccionar es el camino que
    // documenta TipTap y no depende de la posición.
    editor.chain().focus().insertContent(etiquetas.textoPorDefectoEnlace).run();
    const hasta = from + etiquetas.textoPorDefectoEnlace.length;
    editor.chain().focus().setTextSelection({ from, to: hasta }).extendMarkRange('link').setLink({ href: url }).setTextSelection(hasta).run();
  } else {
    const hasta = editor.state.selection.to;
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).setTextSelection(hasta).run();
  }
}
