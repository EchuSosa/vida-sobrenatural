import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ButtonLink } from '../src/components/ui/button-link.js';

/**
 * H-100/H-01: ButtonLink existe para que un enlace que navega renderice un
 * <a> de verdad — nunca el Button de Base UI (que forzaría el warning de
 * nativeButton y todo lo que trae, ver el comentario del componente).
 */

test('sin `render`, renderiza un <a> liso con las clases de buttonVariants', () => {
  const html = renderToStaticMarkup(<ButtonLink href="/sedes">Crear una Sede</ButtonLink>);
  assert.match(html, /^<a /, `debería empezar con un <a>: ${html}`);
  assert.ok(html.includes('href="/sedes"'), html);
  assert.ok(html.includes('Crear una Sede'), html);
});

test('con `render`, compone las props/clases sobre el elemento recibido (ej. un next/link)', () => {
  function FalsoLink({ href, className, children }: { href: string; className?: string; children?: React.ReactNode }) {
    return (
      <a href={href} className={className} data-falso-link="">
        {children}
      </a>
    );
  }

  const html = renderToStaticMarkup(
    <ButtonLink render={<FalsoLink href="/sedes" />} variant="outline" size="sm">
      Crear una Sede
    </ButtonLink>,
  );
  assert.ok(html.includes('data-falso-link=""'), `debería seguir siendo el elemento recibido: ${html}`);
  assert.ok(html.includes('href="/sedes"'), html);
  assert.ok(!html.includes('<button'), `nunca un <button>: ${html}`);
});
