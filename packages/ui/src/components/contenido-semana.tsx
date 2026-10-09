import * as React from 'react';
import { FileText, ImageIcon, Link2 } from 'lucide-react';
import type { ContenidoParaPersona } from '@vida-sobrenatural/shared-types';

export interface ContenidoSemanaProps {
  contenido: Pick<ContenidoParaPersona, 'texto' | 'archivos' | 'enlaces'>;
  /** Adónde lleva cada archivo: una ruta de la app que lo pide a la API con la sesión (FR-024). */
  hrefArchivo: (archivoId: string) => string;
  textos: {
    archivosTitulo: string;
    enlacesTitulo: string;
    /** "Abrir {nombre} ({tamanio})" ya armado. */
    abrirArchivo: (archivo: { nombre: string; tamanioBytes: number }) => string;
  };
}

const URL_EN_TEXTO = /(https?:\/\/[^\s<>"]+)/g;

/** El texto del Líder con sus saltos de línea y sus URLs como enlaces (FR-020). Sin HTML: React escapa todo. */
function TextoConEnlaces({ texto }: { texto: string }) {
  return (
    <div className="flex flex-col gap-3 text-base leading-relaxed">
      {texto.split(/\n{2,}/).map((parrafo, i) => (
        <p key={i} className="whitespace-pre-line break-words">
          {parrafo.split(URL_EN_TEXTO).map((parte, j) =>
            j % 2 === 1 ? (
              <a key={j} href={parte} target="_blank" rel="noopener noreferrer" className="break-all text-primary underline underline-offset-2">
                {parte}
              </a>
            ) : (
              <React.Fragment key={j}>{parte}</React.Fragment>
            ),
          )}
        </p>
      ))}
    </div>
  );
}

/**
 * spec 008, T046 (FR-020, FR-024, D83): el material de una semana — texto,
 * archivos (con nombre y tamaño, que se abren por la API) y enlaces con su
 * texto visible. Las imágenes se muestran con su texto alternativo. Lo usan
 * la Persona y el Líder en la web app y el backoffice en lectura (Principio XI).
 * Los enlaces son siempre visibles como enlaces (subrayados, D81).
 */
export function ContenidoSemana({ contenido, hrefArchivo, textos }: ContenidoSemanaProps) {
  const imagenes = contenido.archivos.filter((a) => a.mimeType.startsWith('image/'));
  return (
    <div className="flex flex-col gap-6">
      {contenido.texto && <TextoConEnlaces texto={contenido.texto} />}

      {/* Privadas, servidas por la API con permiso: un <img> común, no next/image. */}
      {imagenes.map((a) => (
        <img key={a.id} src={hrefArchivo(a.id)} alt={a.textoAlternativo ?? ''} className="h-auto max-w-full rounded-md border border-border" />
      ))}

      {contenido.archivos.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">{textos.archivosTitulo}</h2>
          <ul className="flex flex-col gap-2">
            {contenido.archivos.map((a) => {
              const Icono = a.mimeType.startsWith('image/') ? ImageIcon : FileText;
              return (
                <li key={a.id}>
                  <a
                    href={hrefArchivo(a.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-h-11 items-center gap-2 break-all text-base text-primary underline underline-offset-2"
                  >
                    <Icono aria-hidden className="size-5 shrink-0" />
                    {textos.abrirArchivo({ nombre: a.nombre, tamanioBytes: a.tamanioBytes })}
                  </a>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {contenido.enlaces.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">{textos.enlacesTitulo}</h2>
          <ul className="flex flex-col gap-2">
            {contenido.enlaces.map((e, i) => (
              <li key={i}>
                <a href={e.url} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center gap-2 break-words text-base text-primary underline underline-offset-2">
                  <Link2 aria-hidden className="size-5 shrink-0" />
                  {e.texto}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
