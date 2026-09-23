import { test, expect, loguearseComoAdminE2E } from './helpers';
import { CORPUS_FIDELIDAD_MARKDOWN } from './corpus-fidelidad-markdown';

/**
 * H-118: round-trip de ida y vuelta que mira el CONTENIDO publicado, no
 * solo la ausencia de un elemento — palabra-profetica.spec.ts ya prueba
 * "nunca un h1" para `# texto`, pero esa afirmación pasa igual si el `#`
 * se conserva como texto literal (correcto) o si se traga en silencio (la
 * corrupción que motivó revertir `@tiptap/markdown`, encontrada a mano).
 *
 * Un solo documento con los `CORPUS_FIDELIDAD_MARKDOWN.length` casos, cada
 * uno en su propio bloque separado por un párrafo ancla ("Caso N") — más
 * barato que crear una Palabra Profética por caso, y alcanza: lo que se
 * prueba es que el Markdown GUARDADO sobrevive al segundo parser, no que
 * los casos no se interfieran entre sí (cada uno vive en su propio bloque
 * de nivel superior, ninguno depende del anterior).
 */
test('el texto escrito a mano sobrevive el viaje de ida y vuelta: editor → guardado → página pública', async ({ page }) => {
  const titulo = `e2e-pp-fidelidad-${Date.now()}`;
  await loguearseComoAdminE2E(page);
  await page.goto('/palabra-profetica');
  await page.waitForLoadState('networkidle');

  await page.getByLabel('Año').fill('2027');
  await page.getByLabel('Título').fill(titulo);

  const editor = page.getByLabel('Texto');
  await editor.click();

  for (const [indice, caso] of CORPUS_FIDELIDAD_MARKDOWN.entries()) {
    await page.keyboard.type(`Caso ${indice}`);
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter'); // por si "Caso N" quedó en un contexto especial del caso anterior — no-op sobre un párrafo simple.
    await page.keyboard.type(caso.textoEscrito);
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter'); // saca de blockquote/lista si el caso creó una (mismo mecanismo que palabra-profetica.spec.ts); en un párrafo simple, solo dos párrafos vacíos de más — inofensivo.
  }

  await page.getByRole('button', { name: 'Crear' }).click();
  await expect(page.getByText('Palabra Profética creada.')).toBeVisible();

  const fila = page.getByRole('row', { name: new RegExp(titulo) });
  await fila.getByRole('button', { name: 'Marcar vigente' }).click();
  await expect(page.getByText(`"${titulo}" marcada vigente.`)).toBeVisible();

  const webBaseUrl = process.env.PLAYWRIGHT_WEB_BASE_URL ?? 'http://localhost:3001';
  await page.goto(`${webBaseUrl}/nosotros/palabra-profetica`);
  await page.waitForLoadState('networkidle');

  const anclas = CORPUS_FIDELIDAD_MARKDOWN.map((_, indice) => `Caso ${indice}`);

  /**
   * `unwrapDisallowed` (markdown-seguro.tsx) deja el texto de un elemento
   * NO permitido como texto plano SUELTO — sin ningún `<p>` que lo
   * envuelva (confirmado corriendo esto: el caso de cuatro espacios,
   * reinterpretado por remark como bloque de código indentado y
   * desenvuelto por `pre`/`code` no estar en `ELEMENTOS_PERMITIDOS`,
   * queda como nodo de texto crudo). React además intercala nodos de
   * comentario (`<!-- -->`) alrededor de texto dinámico al hidratar — un
   * `xpath=following-sibling::*[1]` (solo elementos) se salta el texto
   * suelto por completo y cae en el ancla SIGUIENTE. Recorrer `childNodes`
   * a mano, filtrando comentarios y texto que es solo espacio en blanco,
   * es lo único que da, de forma pareja, "el primer nodo con contenido
   * real después de este ancla" para los dos casos (envuelto en un
   * elemento, o texto suelto).
   */
  const bloques = await page.locator('h1 + div').evaluate((contenido, anclas) => {
    const nodos = Array.from(contenido.childNodes).filter((nodo) => {
      if (nodo.nodeType === Node.COMMENT_NODE) return false;
      if (nodo.nodeType === Node.TEXT_NODE && !nodo.textContent?.trim()) return false;
      return true;
    });
    const esAncla = (nodo: ChildNode, texto: string) =>
      nodo.nodeType === Node.ELEMENT_NODE && (nodo as Element).tagName === 'P' && nodo.textContent?.trim() === texto;

    return anclas.map((textoAncla) => {
      const indiceAncla = nodos.findIndex((nodo) => esAncla(nodo, textoAncla));
      const siguiente = indiceAncla === -1 ? null : (nodos[indiceAncla + 1] ?? null);
      if (!siguiente) return { encontrado: false, etiqueta: null, texto: null, html: null };
      return {
        encontrado: true,
        etiqueta: siguiente.nodeType === Node.ELEMENT_NODE ? (siguiente as Element).tagName.toLowerCase() : null,
        texto: (siguiente.textContent ?? '').trim(),
        html: siguiente.nodeType === Node.ELEMENT_NODE ? (siguiente as Element).outerHTML.toLowerCase() : (siguiente.textContent ?? '').toLowerCase(),
      };
    });
  }, anclas);

  for (const [indice, caso] of CORPUS_FIDELIDAD_MARKDOWN.entries()) {
    const bloque = bloques[indice];
    expect(bloque.encontrado, `caso "${caso.nombre}": no se encontró el ancla "Caso ${indice}" en la página publicada`).toBe(true);

    // Fidelidad: el texto publicado es EXACTAMENTE el esperado — literal
    // (con el arranque incluido) para los arranques deshabilitados, o el
    // texto sin el arranque para los habilitados (D3: la sintaxis se
    // consume para crear la estructura real, a propósito).
    expect(bloque.texto, `caso "${caso.nombre}": texto publicado no coincide`).toBe(caso.fragmentoEsperado);

    if (caso.estructura !== 'texto') {
      const etiquetaEsperada = caso.estructura === 'li' ? 'ul' : caso.estructura;
      expect(bloque.etiqueta, `caso "${caso.nombre}": esperaba <${etiquetaEsperada}>, no <${bloque.etiqueta}>`).toBe(etiquetaEsperada);
    } else {
      // Un arranque deshabilitado que sobrevive tiene que quedar como
      // texto SUELTO o dentro de un <p> — nunca dentro de un elemento
      // estructural (eso ya sería la corrupción de H-118, aunque el texto
      // "coincida" de casualidad con lo esperado).
      expect(
        bloque.etiqueta === null || bloque.etiqueta === 'p',
        `caso "${caso.nombre}": el texto quedó envuelto en <${bloque.etiqueta}>, no suelto ni en <p>`,
      ).toBe(true);
    }

    // Seguridad: separada de la fidelidad de arriba (D3) — una corrupción
    // que BORRA el arranque en vez de convertirlo en estructura real
    // pasaría la fidelidad (si el resto del texto coincidiera) pero no
    // esta, o viceversa.
    for (const prohibido of caso.prohibidos) {
      expect(bloque.html, `caso "${caso.nombre}": no debería contener <${prohibido}>\n${bloque.html}`).not.toContain(`<${prohibido}`);
    }
  }
});
