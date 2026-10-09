import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * spec 012, T037 (FR-010, Principio XI) — ningún archivo de `apps/api/src`
 * fuera de `notificaciones/` escribe en `notificaciones` ni en
 * `entregas_notificacion`: para avisar algo se llama a `emitir`.
 */
const src = resolve(dirname(fileURLToPath(import.meta.url)), '../../src');

function archivos(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const ruta = join(dir, n);
    if (statSync(ruta).isDirectory()) return n === 'generated' ? [] : archivos(ruta);
    return ruta.endsWith('.ts') ? [ruta] : [];
  });
}

const ESCRITURA_CLIENTE = /\.(notificacion|entregaNotificacion)\s*\.\s*(create|createMany|update|updateMany|upsert|delete|deleteMany)\b/;
const ESCRITURA_SQL = /(INSERT\s+INTO|UPDATE|DELETE\s+FROM)\s+"(notificaciones|entregas_notificacion)"/i;

describe('Un solo escritor de avisos (T037)', () => {
  it('fuera de src/notificaciones nadie escribe en notificaciones ni entregas_notificacion', () => {
    const intrusos = archivos(src)
      .filter((f) => !relative(src, f).startsWith('notificaciones/'))
      .filter((f) => {
        const texto = readFileSync(f, 'utf8');
        return ESCRITURA_CLIENTE.test(texto) || ESCRITURA_SQL.test(texto);
      })
      .map((f) => relative(src, f));
    expect(intrusos).toEqual([]);
  });

  it('el detector encuentra una escritura (para que el test no pase vacío)', () => {
    expect(ESCRITURA_CLIENTE.test('await tx.entregaNotificacion.createMany({')).toBe(true);
    expect(ESCRITURA_SQL.test('INSERT INTO "notificaciones" ("id")')).toBe(true);
  });
});
