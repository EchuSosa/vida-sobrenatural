import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TELEFONO_REGEX } from '@vida-sobrenatural/shared-types';

/**
 * BUG-12 (QA ronda 2): `db:seed` cargaba La Plata con "+54 9 221 000-0000". La API rechaza el guion
 * (`TELEFONO_REGEX`), así que la Sede no se podía guardar sin tocar un campo que nadie había
 * cambiado; lo mismo pasaba con los teléfonos de las Personas demo en Perfil. Todo teléfono de las
 * semillas tiene que pasar la misma validación que la API.
 */
const prisma = resolve(dirname(fileURLToPath(import.meta.url)), '../../prisma');
const SEMILLAS = ['seed.ts', 'seed-demo.ts'];

function telefonosDe(archivo: string): string[] {
  const texto = readFileSync(resolve(prisma, archivo), 'utf8');
  const valores = [...texto.matchAll(/[tT]elefono\w*\s*[:=]\s*'([^']+)'/g)].map((m) => m[1]);
  // La constante con el teléfono de contacto de La Plata.
  valores.push(...[...texto.matchAll(/TELEFONO_CONTACTO_DEMO\s*=\s*'([^']+)'/g)].map((m) => m[1]));
  return valores;
}

describe('Teléfonos de las semillas (BUG-12)', () => {
  it.each(SEMILLAS)('%s: todos pasan TELEFONO_REGEX, la validación de la API', (archivo) => {
    const telefonos = telefonosDe(archivo);
    expect(telefonos.length).toBeGreaterThan(0);
    expect(telefonos.filter((t) => !TELEFONO_REGEX.test(t))).toEqual([]);
  });
});
