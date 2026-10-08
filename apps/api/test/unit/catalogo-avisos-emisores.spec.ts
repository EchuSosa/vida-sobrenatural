import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATALOGO_AVISOS, NOMBRES_EVENTOS_AVISO, type SpecDelAviso } from '@vida-sobrenatural/shared-types';

/**
 * spec 012, lote F (specs/IMPLEMENTACION.md §4: "verificar, al cierre, que
 * cada evento del catálogo tenga quien lo emita") — cada evento aparece como
 * `nombre: '<evento>'` en algún archivo de `apps/api/src`. Las specs que
 * todavía no están en `main` se listan aparte: cuando entren con sus
 * emisiones, el test sigue pasando; si una entra SIN emitir, el test de la
 * lista de abajo lo marca al sacarla.
 */
const SPECS_TODAVIA_NO_EN_MAIN: readonly SpecDelAviso[] = ['008', '010'];

const src = resolve(dirname(fileURLToPath(import.meta.url)), '../../src');
function archivos(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const ruta = join(dir, n);
    if (statSync(ruta).isDirectory()) return n === 'generated' ? [] : archivos(ruta);
    return ruta.endsWith('.ts') ? [ruta] : [];
  });
}
const fuentes = archivos(src)
  .filter((f) => !f.includes('/notificaciones/'))
  .map((f) => readFileSync(f, 'utf8'))
  .join('\n');

describe('Cada evento del catálogo tiene quien lo emita (lote F)', () => {
  const aVerificar = NOMBRES_EVENTOS_AVISO.filter((n) => !SPECS_TODAVIA_NO_EN_MAIN.includes(CATALOGO_AVISOS[n].spec));

  it.each(aVerificar)('%s se emite desde la API', (nombre) => {
    expect(fuentes).toContain(`nombre: '${nombre}'`);
  });
});
