#!/usr/bin/env node
/**
 * H-119 (revisión manual): guarda mecánica para que un contrato que tiene
 * que vivir en un solo lugar (ej. `configurar-app.ts` — el filtro de
 * excepciones + el pipe de validación de la app real) no se vuelva a
 * reconstruir a mano en otro archivo, sin que nadie se entere.
 *
 * Chequea el IMPORT, no el `new X()`: importar es condición necesaria
 * para instanciar, así que atrapa todo lo que atraparía buscar `new X` —
 * más los casos que ese regex se pierde (un alias en el import, una
 * constante intermedia, un re-export). Un import de SOLO TIPO
 * (`import type {...}` o `import { type X, ... }`) se permite a
 * propósito: TypeScript lo borra en la compilación, no hay manera de
 * instanciar nada con eso — solo el binding de VALOR importa acá.
 *
 * Pensado para tener hermanos: REGLAS es una lista, cada una con su
 * propio criterio de qué se prohíbe y dónde se permite. Sumar una regla
 * nueva no exige tocar el motor de abajo (buscarImportesProhibidos /
 * recorrerArchivos).
 *
 * Uso: node scripts/chequear-imports-prohibidos.mjs
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.join(__dirname, '..');

/**
 * Cada regla prohíbe un conjunto de (módulo, nombre importado) salvo en
 * los archivos listados en `permitidoEn` (ruta relativa a la raíz del
 * repo, comparación exacta — no hace falta un glob para un solo archivo).
 * `modulo` puede ser un string (match exacto del specifier) o una RegExp
 * (para specifiers relativos, que cambian según desde dónde se importe).
 */
const REGLAS = [
  {
    descripcion: 'ValidationPipe/AllExceptionsFilter fuera de configurar-app.ts (H-119)',
    directorios: ['apps/api/src', 'apps/api/test'],
    extensiones: ['.ts'],
    importsProhibidos: [
      { modulo: '@nestjs/common', nombre: 'ValidationPipe' },
      { modulo: /all-exceptions\.filter\.js$/, nombre: 'AllExceptionsFilter' },
    ],
    permitidoEn: [
      'apps/api/src/configurar-app.ts',
      // No es H-119 (esto no arma una app distinta de la real): prueba la
      // CLASE AllExceptionsFilter en aislamiento, con un ArgumentsHost
      // mockeado a mano, sin INestApplication ni ValidationPipe — un test
      // unitario del filtro, no un spec de integración que ensambla una
      // app. Hallado corriendo este chequeo por primera vez, no anticipado
      // al escribirlo — ver el reporte.
      'apps/api/test/unit/all-exceptions-filter.spec.ts',
    ],
    comoCorregir: 'Usá configurarApp(app) (apps/api/src/configurar-app.ts) en vez de instanciar esto a mano.',
  },
  {
    // H-130: un teardown que borra archivos tiene que pasar por la guarda
    // que verifica que su destino es de test (scripts/destino-de-test.cjs:
    // borrarDestinoDeTest) — un `rm(process.env.X ?? './default')` suelto
    // en un spec borró la carpeta de portadas de desarrollo durante seis
    // días. Esta regla hace que el próximo `rm` en una suite no pueda
    // escribirse sin que alguien lo vea.
    //
    // Lo que esta regla NO cubre — que nadie la lea como más de lo que es:
    // - Solo ve imports CON NOMBRE (`import { rm } from 'node:fs/promises'`).
    //   No ve `import * as fs from 'node:fs'`, `import fs from 'node:fs'`
    //   (y después `fs.rmSync`), ni `require('node:fs')` en un .cjs.
    // - No ve un borrado por otro camino: `child_process` (`rm -rf`,
    //   `execSync('rimraf …')`), ni librerías como fs-extra, rimraf o del.
    // - No mira qué se borra ni dónde: solo que el import está.
    // - Solo recorre apps/api/test, apps/backoffice/e2e y apps/web/e2e; un
    //   script de mantenimiento en otro lado (ej. apps/api/scripts/) no.
    descripcion: 'borrado de archivos en una suite sin pasar por la guarda de destino de test (H-130)',
    directorios: ['apps/api/test', 'apps/backoffice/e2e', 'apps/web/e2e'],
    extensiones: ['.ts'],
    importsProhibidos: ['node:fs', 'fs', 'node:fs/promises', 'fs/promises'].flatMap((modulo) =>
      ['rm', 'rmSync', 'rmdir', 'rmdirSync', 'unlink', 'unlinkSync'].map((nombre) => ({ modulo, nombre })),
    ),
    permitidoEn: [
      // El test de la propia guarda: limpia solo carpetas que él mismo creó
      // con mkdtemp, para poder probar los casos de rechazo (una carpeta
      // ajena, un symlink que sale del temporal) sin pasar por la guarda
      // que justamente los rechaza.
      'apps/api/test/unit/destino-de-test.spec.ts',
    ],
    comoCorregir:
      'Borrá con borrarDestinoDeTest(ruta) de scripts/destino-de-test.cjs, que verifica que la ruta es la carpeta temporal de esta corrida antes de borrar — nunca con un default.',
  },
];

/**
 * Extrae las declaraciones `import ... from '...';` de un archivo TS —
 * suficiente para este chequeo (no hace falta un parser completo: la
 * sintaxis de un import es mucho más acotada que un call-site de `new X`
 * en cualquier parte del archivo, que es justo el problema que este
 * chequeo evita tener que resolver).
 */
function extraerImports(contenido) {
  const resultado = [];
  // Contempla imports multilínea (`s` = el `.` también matchea saltos de línea).
  const regexImport = /import\s+(type\s+)?(\{[^}]*\}|\*\s+as\s+\w+|\w+)?\s*(?:,\s*(\{[^}]*\}))?\s*from\s*['"]([^'"]+)['"]/gs;
  let match;
  while ((match = regexImport.exec(contenido)) !== null) {
    const [lineaCompleta, esTypeGlobal, clausulaPrincipal, clausulaExtra, especificador] = match;
    const lineaNumero = contenido.slice(0, match.index).split('\n').length;
    const bindings = [];
    for (const clausula of [clausulaPrincipal, clausulaExtra]) {
      if (!clausula || !clausula.startsWith('{')) continue;
      const nombres = clausula
        .slice(1, -1)
        .split(',')
        .map((n) => n.trim())
        .filter(Boolean);
      for (const nombre of nombres) {
        const esTypeIndividual = /^type\s+/.test(nombre);
        const nombreLimpio = nombre
          .replace(/^type\s+/, '')
          .split(/\s+as\s+/)[0]
          .trim();
        bindings.push({ nombre: nombreLimpio, esTipo: Boolean(esTypeGlobal) || esTypeIndividual });
      }
    }
    resultado.push({ especificador, bindings, linea: lineaNumero, raw: lineaCompleta });
  }
  return resultado;
}

function moduloCoincide(modulo, especificador) {
  return modulo instanceof RegExp ? modulo.test(especificador) : modulo === especificador;
}

function* recorrerArchivos(directorio, extensiones) {
  let entradas;
  try {
    entradas = readdirSync(directorio);
  } catch {
    return;
  }
  for (const entrada of entradas) {
    const rutaCompleta = path.join(directorio, entrada);
    const info = statSync(rutaCompleta);
    if (info.isDirectory()) {
      if (entrada === 'node_modules' || entrada === 'dist' || entrada === 'generated') continue;
      yield* recorrerArchivos(rutaCompleta, extensiones);
    } else if (extensiones.some((ext) => entrada.endsWith(ext))) {
      yield rutaCompleta;
    }
  }
}

function chequearImportsProhibidos() {
  const violaciones = [];

  for (const regla of REGLAS) {
    const permitidoEnAbsoluto = new Set(regla.permitidoEn.map((p) => path.join(RAIZ, p)));

    for (const dirRelativo of regla.directorios) {
      const dirAbsoluto = path.join(RAIZ, dirRelativo);
      for (const archivo of recorrerArchivos(dirAbsoluto, regla.extensiones)) {
        if (permitidoEnAbsoluto.has(archivo)) continue;

        const contenido = readFileSync(archivo, 'utf-8');
        const imports = extraerImports(contenido);
        const rutaRelativa = path.relative(RAIZ, archivo);

        for (const { especificador, bindings, linea } of imports) {
          for (const prohibido of regla.importsProhibidos) {
            if (!moduloCoincide(prohibido.modulo, especificador)) continue;
            const binding = bindings.find((b) => b.nombre === prohibido.nombre);
            if (binding && !binding.esTipo) {
              violaciones.push({
                archivo: rutaRelativa,
                linea,
                nombre: prohibido.nombre,
                descripcion: regla.descripcion,
                comoCorregir: regla.comoCorregir,
              });
            }
          }
        }
      }
    }
  }

  return violaciones;
}

const violaciones = chequearImportsProhibidos();

if (violaciones.length === 0) {
  console.log('OK — ningún import prohibido fuera de donde corresponde.');
  process.exit(0);
}

console.error('Imports prohibidos encontrados:\n');
for (const v of violaciones) {
  console.error(`  ${v.archivo}:${v.linea} — importa "${v.nombre}" (${v.descripcion})`);
  console.error(`    → ${v.comoCorregir}\n`);
}
process.exit(1);
