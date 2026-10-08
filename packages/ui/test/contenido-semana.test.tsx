import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ContenidoSemana } from '../src/components/contenido-semana.js';

const textos = { archivosTitulo: 'Archivos', enlacesTitulo: 'Enlaces', abrirArchivo: ({ nombre }: { nombre: string }) => `Abrir ${nombre}` };

/** spec 008 (FR-020, D83): las URLs del texto son enlaces, el HTML se escapa, las imágenes llevan su texto alternativo. */
test('texto con enlaces, sin inyectar HTML', () => {
  const html = renderToStaticMarkup(
    <ContenidoSemana
      contenido={{ texto: 'Leé esto <b>ya</b>: https://example.com/a?b=1\n\nSegundo párrafo', archivos: [], enlaces: [] }}
      hrefArchivo={(id) => `/archivos/${id}`}
      textos={textos}
    />,
  );
  assert.ok(html.includes('href="https://example.com/a?b=1"'), html);
  assert.ok(html.includes('&lt;b&gt;ya&lt;/b&gt;'), html);
  assert.ok(html.includes('Segundo párrafo'), html);
});

test('archivos por la ruta de la app; imágenes con alt', () => {
  const html = renderToStaticMarkup(
    <ContenidoSemana
      contenido={{
        texto: null,
        archivos: [
          { id: 'a1', nombre: 'guia.pdf', mimeType: 'application/pdf', tamanioBytes: 1000, textoAlternativo: null },
          { id: 'a2', nombre: 'lamina.png', mimeType: 'image/png', tamanioBytes: 1000, textoAlternativo: 'Lámina de la semana' },
        ],
        enlaces: [{ texto: 'Video', url: 'https://example.com/v' }],
      }}
      hrefArchivo={(id) => `/archivos/${id}`}
      textos={textos}
    />,
  );
  assert.ok(html.includes('href="/archivos/a1"') && html.includes('Abrir guia.pdf'), html);
  assert.ok(html.includes('alt="Lámina de la semana"'), html);
  assert.ok(html.includes('href="https://example.com/v"') && html.includes('Video'), html);
});
