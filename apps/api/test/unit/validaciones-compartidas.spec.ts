import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { TELEFONO_REGEX, HORARIOS_SEDE_REGEX } from '@vida-sobrenatural/shared-types';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');

// H-33 (revisión manual, actualización 2026-09-20): red que faltaba. Antes de
// este fix, apps/api y apps/backoffice tenían cada uno su propia copia
// inline de estos regex — nada fallaba si una copia cambiaba y las otras no.
// Ahora los dos importan el mismo valor de @vida-sobrenatural/shared-types,
// así que ya no pueden divergir estructuralmente; este archivo cubre las dos
// formas en que el error podría reaparecer: (1) que el valor compartido
// cambie sin querer, (2) que alguien vuelva a definir una copia local.
describe('TELEFONO_REGEX (D90, H-30) — formato acotado', () => {
  it.each(['+549221 1234567', '+54 9 221 1234567', '+1 5551234567'])('acepta %s', (valor) => {
    expect(TELEFONO_REGEX.test(valor)).toBe(true);
  });

  it.each(['221 1234567', '+', '', 'no-es-un-telefono', '+54'])('rechaza %s', (valor) => {
    expect(TELEFONO_REGEX.test(valor)).toBe(false);
  });
});

describe('HORARIOS_SEDE_REGEX (H-30) — formato acotado', () => {
  it.each([
    'Domingos 10:30 hs',
    'Domingos 10:30 hs.',
    'Domingos 10 hs y Martes 19:30 hs',
    'Domingos 10 hs, Martes 19 hs',
  ])('acepta %s', (valor) => {
    expect(HORARIOS_SEDE_REGEX.test(valor)).toBe(true);
  });

  it.each(['Domingos 10 y 18 hs', '12', '', 'domingos 10:30 hs', 'Domingos 10:30'])(
    'rechaza %s',
    (valor) => {
      expect(HORARIOS_SEDE_REGEX.test(valor)).toBe(false);
    },
  );
});

describe('H-33 — apps/api y apps/backoffice importan el valor compartido, no una copia local', () => {
  const archivosConImportEsperado = [
    'apps/api/src/persona/dto/registro-persona.dto.ts',
    'apps/api/src/sede/dto/crear-sede.dto.ts',
    'apps/api/src/sede/dto/actualizar-sede.dto.ts',
    'apps/backoffice/src/app/sedes/page.tsx',
  ];

  it.each(archivosConImportEsperado)('%s importa de @vida-sobrenatural/shared-types', (rutaRelativa) => {
    const contenido = readFileSync(resolve(repoRoot, rutaRelativa), 'utf-8');
    expect(contenido).toMatch(/from ['"]@vida-sobrenatural\/shared-types['"]/);
  });

  it.each(archivosConImportEsperado)('%s no redefine TELEFONO_REGEX/HORARIOS_SEDE_REGEX localmente', (rutaRelativa) => {
    const contenido = readFileSync(resolve(repoRoot, rutaRelativa), 'utf-8');
    expect(contenido).not.toMatch(/\bconst\s+(TELEFONO_REGEX|HORARIOS_SEDE_REGEX|GRUPO_HORARIO)\s*=/);
  });
});
