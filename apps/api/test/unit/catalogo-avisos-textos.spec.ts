import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATALOGO_AVISOS, NOMBRES_EVENTOS_AVISO } from '@vida-sobrenatural/shared-types';
import { DATOS_EJEMPLO } from './avisos-datos-ejemplo.js';

/**
 * spec 012, T015 — FR-040, SC-006, SC-009: cada aviso que le llega a una
 * Persona tiene su título y su detalle en la web; ningún texto nombra a una
 * Persona ni un motivo; los placeholders que usa existen en los `datos` del
 * evento (si no, la web mostraría "{algo}" literal).
 */
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const web = JSON.parse(readFileSync(resolve(repoRoot, 'apps/web/src/messages/es.json'), 'utf8')) as {
  avisos: { eventos: Record<string, Record<string, { titulo: string; detalle: string }>> };
};

const placeholders = (texto: string) => [...texto.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);

describe('Textos de los avisos en la web (spec 012, T015)', () => {
  const conTexto = NOMBRES_EVENTOS_AVISO.filter((n) => CATALOGO_AVISOS[n].destinatario !== 'admin');

  it.each(conTexto)('%s tiene título y detalle, sin datos personales y con placeholders que existen', (nombre) => {
    const [dominio, evento] = nombre.split('.');
    const textos = web.avisos.eventos[dominio]?.[evento];
    expect(typeof textos?.titulo).toBe('string');
    expect(typeof textos?.detalle).toBe('string');
    const todo = `${textos.titulo} ${textos.detalle}`;
    expect(todo).not.toMatch(/\{(nombre|apellido|persona|email|telefono|motivo)\}/i);
    expect(todo.toLowerCase()).not.toContain('motivo');
    const datos = DATOS_EJEMPLO[nombre] as Record<string, unknown>;
    for (const p of placeholders(todo)) expect({ nombre, placeholder: p, existe: p in datos }).toEqual({ nombre, placeholder: p, existe: true });
  });

  it('no sobran textos de eventos que no están en el catálogo', () => {
    for (const [dominio, eventos] of Object.entries(web.avisos.eventos)) {
      for (const evento of Object.keys(eventos)) expect(NOMBRES_EVENTOS_AVISO).toContain(`${dominio}.${evento}`);
    }
  });
});
