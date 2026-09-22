import * as React from 'react';
import Markdown, { type Components } from 'react-markdown';
import { cn } from '../lib/utils';

/**
 * H-90/D127 (docs/05-decisiones.md): renderiza Markdown guardado a un
 * conjunto CERRADO de elementos — nunca `dangerouslySetInnerHTML` sobre lo
 * guardado. Se usa tanto en el servidor (la página pública de la Palabra
 * Profética) como en la vista previa del backoffice; en los dos casos es
 * el mismo componente, sin duplicar la lista de elementos permitidos en
 * dos lugares (Principio XI).
 *
 * Permitido: negrita, itálica, párrafos, listas, enlaces, h2 y h3. NUNCA
 * h1 (la página ya tiene el suyo — dos h1 rompen la jerarquía de
 * encabezados, axe lo marca). `unwrapDisallowed`: lo que no está en la
 * lista no desaparece silenciosamente ni revienta — se muestra como texto
 * plano, sin la marca que no le corresponde (un h1 escrito a mano se ve
 * como texto, no como título; sigue siendo inofensivo).
 *
 * `react-markdown` no usa `dangerouslySetInnerHTML`: parsea a un árbol y
 * arma elementos de React nodo por nodo. HTML crudo en el texto guardado
 * (ej. un `<script>`) nunca se convierte en un elemento real — sin el
 * plugin `rehype-raw` (queACÁ NO se instala a propósito) queda como texto
 * escapado, nunca ejecutable.
 */

const ELEMENTOS_PERMITIDOS = ['p', 'strong', 'em', 'ul', 'ol', 'li', 'a', 'h2', 'h3'];

/** Solo http/https — ni `javascript:`, ni `mailto:`, ni un esquema relativo sin protocolo. */
function esquemaPermitido(url: string): boolean {
  const esquema = /^([a-z][a-z0-9+.-]*):/i.exec(url.trim())?.[1]?.toLowerCase();
  return esquema === 'http' || esquema === 'https';
}

function transformarUrl(url: string): string {
  return esquemaPermitido(url) ? url : '';
}

/** Sin `href` (esquema bloqueado, o vacío) el enlace se degrada a texto plano — nunca un `<a>` roto o peligroso. */
function EnlaceSeguro({ href, children, ...props }: React.ComponentProps<'a'>) {
  if (!href) return <>{children}</>;
  return (
    <a href={href} rel="noopener noreferrer" {...props}>
      {children}
    </a>
  );
}

const COMPONENTES: Components = {
  a: EnlaceSeguro,
};

export interface MarkdownSeguroProps {
  texto: string;
  className?: string;
}

/**
 * Markdown vacío de marcas (el texto provisorio actual de la Palabra
 * Profética, sin negrita/listas/etc.) se renderiza como texto plano — un
 * párrafo por bloque separado por línea en blanco, sin verse distinto de
 * antes.
 */
export function MarkdownSeguro({ texto, className }: MarkdownSeguroProps) {
  return (
    <div className={cn(className)}>
      <Markdown allowedElements={ELEMENTOS_PERMITIDOS} unwrapDisallowed urlTransform={transformarUrl} components={COMPONENTES}>
        {texto}
      </Markdown>
    </div>
  );
}
