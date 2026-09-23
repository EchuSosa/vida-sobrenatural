/**
 * H-118: dos parsers de Markdown distintos en el camino del dato — el del
 * editor (`tiptap-markdown`, packages/ui/src/components/editor-markdown.tsx)
 * y el del renderizador de la página pública (`react-markdown`/remark,
 * `markdown-seguro.tsx`). El e2e viejo (palabra-profetica.spec.ts) solo
 * comprobaba UN caso (`# texto`) y solo la propiedad de seguridad ("nunca
 * un h1") — pasaba igual si el `#` se conservaba como texto literal
 * (correcto) o si se tragaba en silencio (la corrupción que motivó
 * revertir `@tiptap/markdown`).
 *
 * Este corpus cubre los arranques de bloque de Markdown y las marcas
 * inline que `tiptap-markdown` ya escapa (heredado de
 * `prosemirror-markdown`, `MarkdownSerializerState.esc()`) — para que la
 * corrupción de CUALQUIERA de ellos, no solo `#`, se note. Agregar un caso
 * es agregar una entrada a este array.
 *
 * Cada caso declara qué pasa en el editor al escribirlo tal cual (con
 * `page.keyboard.type`, letra por letra, como un usuario real):
 *
 * - `estructura: 'texto'` — el arranque queda como texto literal (h1,
 *   lista numerada, bloque de código y regla horizontal están
 *   deshabilitados en `editor-markdown.tsx`, así que TipTap no tiene
 *   ninguna input rule que los intercepte). `fragmentoEsperado` es el
 *   texto COMPLETO, arranque incluido — la fidelidad es "es idéntico a lo
 *   que escribí".
 * - `estructura: 'h2' | 'blockquote' | 'li'` — el arranque SÍ está
 *   habilitado (subtítulo, cita, lista con viñetas) y la input rule de
 *   TipTap lo convierte en el elemento real mientras se escribe — igual
 *   que si se hubiera usado el botón de la barra. `fragmentoEsperado` es
 *   el texto SIN el arranque (la sintaxis se consume para crear la
 *   estructura, no se pierde: se transforma, a propósito). La fidelidad
 *   acá es "se volvió la MISMA estructura de los dos lados, con el mismo
 *   texto".
 *
 * `prohibidos`: elementos que NO tienen que aparecer en el bloque
 * publicado correspondiente a este caso — la propiedad de seguridad,
 * separada de la de fidelidad (D3: ninguna de las dos sola alcanza).
 */
export interface CasoFidelidadMarkdown {
  nombre: string;
  textoEscrito: string;
  estructura: 'texto' | 'h2' | 'blockquote' | 'li';
  fragmentoEsperado: string;
  prohibidos: string[];
}

export const CORPUS_FIDELIDAD_MARKDOWN: CasoFidelidadMarkdown[] = [
  // Arranques de bloque deshabilitados en el editor (StarterKit.configure,
  // editor-markdown.tsx) — tienen que sobrevivir como texto literal en los
  // dos lados. Es acá donde vivía la corrupción que motivó H-118.
  { nombre: 'numeral (h1, deshabilitado)', textoEscrito: '# Esto no debería ser un h1', estructura: 'texto', fragmentoEsperado: '# Esto no debería ser un h1', prohibidos: ['h1'] },
  { nombre: 'lista numerada (deshabilitada)', textoEscrito: '1. Corintios 13 no es una lista', estructura: 'texto', fragmentoEsperado: '1. Corintios 13 no es una lista', prohibidos: ['ol', 'li'] },
  { nombre: 'bloque de código (deshabilitado)', textoEscrito: '```no es un bloque de código', estructura: 'texto', fragmentoEsperado: '```no es un bloque de código', prohibidos: ['pre', 'code'] },
  { nombre: 'regla horizontal (deshabilitada)', textoEscrito: '---', estructura: 'texto', fragmentoEsperado: '---', prohibidos: ['hr'] },
  // Espacios al principio: no hay forma de comprobar que sobrevivan
  // VISIBLES (el navegador colapsa espacios, y las comparaciones de texto
  // de Playwright normalizan espacio en blanco) — lo que importa acá es
  // que NO se conviertan en un bloque de código indentado.
  { nombre: 'indentación de cuatro espacios', textoEscrito: '    con cuatro espacios adelante', estructura: 'texto', fragmentoEsperado: 'con cuatro espacios adelante', prohibidos: ['pre', 'code'] },

  // Arranques de bloque HABILITADOS — la input rule de TipTap los
  // convierte en estructura real mientras se escribe (D127: mismo
  // resultado que el botón de la barra). Lo que se comprueba acá es que
  // el camino "sintaxis Markdown escrita a mano" y el camino "botón de la
  // barra" (ya cubierto en palabra-profetica.spec.ts) terminan en el MISMO
  // elemento en la página pública.
  { nombre: 'subtitulo (## , habilitado)', textoEscrito: '## Subtitulo escrito a mano', estructura: 'h2', fragmentoEsperado: 'Subtitulo escrito a mano', prohibidos: ['h1'] },
  { nombre: 'cita (> , habilitada)', textoEscrito: '> Una cita escrita a mano', estructura: 'blockquote', fragmentoEsperado: 'Una cita escrita a mano', prohibidos: ['h1'] },
  { nombre: 'lista con guion (- , habilitada)', textoEscrito: '- Item con guion', estructura: 'li', fragmentoEsperado: 'Item con guion', prohibidos: ['h1'] },
  { nombre: 'lista con asterisco (* , habilitada)', textoEscrito: '* Item con asterisco', estructura: 'li', fragmentoEsperado: 'Item con asterisco', prohibidos: ['h1'] },

  // Marcas inline que `esc()` (prosemirror-markdown, heredado por
  // tiptap-markdown) ya escapa sin condición de posición — un solo
  // carácter suelto de cada una, sin formar un par válido de énfasis o
  // enlace, para que ni la input rule del editor ni el parser de la
  // página pública tengan nada que interpretar salvo texto literal.
  { nombre: 'asterisco suelto', textoEscrito: 'El total es 100 * 2 = 200 (no es itálica)', estructura: 'texto', fragmentoEsperado: 'El total es 100 * 2 = 200 (no es itálica)', prohibidos: ['em', 'strong'] },
  { nombre: 'guion bajo intrapalabra', textoEscrito: 'la variable nombre_de_variable sin formato', estructura: 'texto', fragmentoEsperado: 'la variable nombre_de_variable sin formato', prohibidos: ['em', 'strong'] },
  { nombre: 'corchetes sin enlace', textoEscrito: 'Ver la referencia [1] al final', estructura: 'texto', fragmentoEsperado: 'Ver la referencia [1] al final', prohibidos: ['a'] },
  { nombre: 'virgulilla suelta', textoEscrito: 'la temperatura ~20 grados', estructura: 'texto', fragmentoEsperado: 'la temperatura ~20 grados', prohibidos: ['del', 's'] },
];
