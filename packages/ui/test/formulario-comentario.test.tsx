import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { FormularioComentario, type TextosFormularioComentario } from '../src/components/formulario-comentario.js';

/** spec 013, T013: lo que se ve antes de interactuar (los e2e de la web y el backoffice cubren el envío). */
const TEXTOS: TextosFormularioComentario = {
  tipoLeyenda: '¿Qué nos querés contar?',
  tipos: { problema: { etiqueta: 'Un problema', ayuda: 'Algo no anda' }, sugerencia: { etiqueta: 'Una sugerencia', ayuda: 'Una idea' } },
  texto: 'Contanos',
  ayudaTexto: 'Ayuda',
  contador: (n, max) => `${n} de ${max}`,
  aceptaContacto: 'Pueden contactarme',
  ayudaAceptaContactoConSesion: 'Usamos los datos de tu perfil',
  contactoLeyenda: '¿Cómo te contactamos?',
  ayudaContacto: 'Uno de los dos',
  contactoEmail: 'Email',
  contactoTelefono: 'Teléfono',
  codigoPais: 'Código de país',
  enviar: 'Enviar',
  enviando: 'Enviando…',
  tituloResumen: 'Revisá esto',
  mensajeCampo: (campo, code) => `${campo}:${code}`,
  demasiados: (m) => `${m} minutos`,
  errorGeneral: 'Error',
  confirmacionTitulo: '¡Gracias!',
  confirmacionDetalle: () => 'Lo vamos a leer',
  otro: 'Mandar otro',
};

function render(conSesion: boolean) {
  return renderToStaticMarkup(
    <FormularioComentario textos={TEXTOS} conSesion={conSesion} paginaOrigen="/inicio" app="web" enviar={async () => ({ ok: true })} />,
  );
}

test('FormularioComentario: tipo con dos opciones, texto con contador y la casilla de contacto', () => {
  const html = render(false);
  assert.match(html, /id="campo-tipo"/);
  assert.match(html, /Un problema/);
  assert.match(html, /Una sugerencia/);
  assert.match(html, /id="campo-texto"/);
  assert.match(html, /0 de 2000/);
  assert.match(html, /Pueden contactarme/);
  // Los campos de contacto aparecen recién al marcar la casilla.
  assert.doesNotMatch(html, /campo-contactoEmail/);
});

test('FormularioComentario: con sesión explica que usa los datos del perfil', () => {
  assert.match(render(true), /Usamos los datos de tu perfil/);
  assert.doesNotMatch(render(false), /Usamos los datos de tu perfil/);
});
