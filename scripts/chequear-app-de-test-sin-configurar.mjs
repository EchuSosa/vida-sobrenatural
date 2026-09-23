#!/usr/bin/env node
/**
 * H-121: la guardia de scripts/chequear-imports-prohibidos.mjs comprueba
 * "nadie importa ValidationPipe/AllExceptionsFilter fuera de
 * configurar-app.ts" — el MECANISMO. Lo que nos importa es la PROPIEDAD:
 * "toda app de test queda configurada como la de producción". No es lo
 * mismo — entre las dos queda el hueco de armar una app con
 * `createNestApplication()` y no llamar a NINGUNA configuración. Es
 * justo el caso que quedó vivo en `apps/api/test/app.e2e-spec.ts`, que no
 * importa ninguna de las dos piezas prohibidas (así que la guardia de
 * imports lo deja pasar) y tampoco llama a `configurarApp`.
 *
 * Por qué es un SCRIPT APARTE y no una regla más del motor de
 * chequear-imports-prohibidos.mjs (H-121, C2): esa guardia mira
 * (módulo, nombre importado) — sintaxis de import, plana. Esta necesita
 * encontrar el BLOQUE que envuelve una llamada (`createNestApplication`)
 * y buscar otra llamada (`configurarApp`) ADENTRO de ese mismo bloque —
 * requiere calzar llaves para encontrar el alcance, algo que el motor de
 * imports no modela. Forzarlo adentro hubiera significado torcer ese
 * motor para un caso que no es el suyo — dos scripts honestos, cada uno
 * con su propia forma de mirar el código, en vez de uno abstracto de más.
 *
 * Uso: node scripts/chequear-app-de-test-sin-configurar.mjs
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.join(__dirname, '..');

/**
 * Cada regla: una llamada que TIENE que venir acompañada de otra, dentro
 * del mismo bloque envolvente — salvo en los archivos de `permitidoEn`.
 */
const REGLAS = [
  {
    descripcion: 'createNestApplication() sin configurarApp() en el mismo bloque (H-121)',
    directorios: ['apps/api/src', 'apps/api/test'],
    extensiones: ['.ts'],
    llamadaQueDisparaElChequeo: 'createNestApplication',
    llamadaQueTieneQueEstar: 'configurarApp(',
    permitidoEn: [],
    comoCorregir: 'Llamá a configurarApp(app) en el mismo bloque (la misma función beforeAll/beforeEach) donde se crea la app — mismo criterio que las otras diez llamadas de apps/api/test.',
  },
];

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

/** Todas las posiciones (índice de carácter) donde aparece `aguja` en `contenido`. */
function* posicionesDe(contenido, aguja) {
  let desde = 0;
  while (true) {
    const idx = contenido.indexOf(aguja, desde);
    if (idx === -1) return;
    yield idx;
    desde = idx + aguja.length;
  }
}

/**
 * Retrocede desde `posicion` calzando llaves para encontrar el '{' que
 * abre el bloque envolvente MÁS CERCANO — saltando cualquier bloque ya
 * cerrado antes de `posicion` (ej. el objeto `{ imports: [AppModule] }`
 * de `Test.createTestingModule({...})`, que aparece antes en el texto
 * pero es un bloque hermano, no el envolvente).
 */
function encontrarAperturaDeBloque(contenido, posicion) {
  let profundidad = 0;
  for (let i = posicion; i >= 0; i--) {
    const c = contenido[i];
    if (c === '}') {
      profundidad++;
    } else if (c === '{') {
      if (profundidad === 0) return i;
      profundidad--;
    }
  }
  return -1;
}

/** Desde una apertura de bloque conocida, encuentra su cierre calzando llaves hacia adelante. */
function encontrarCierreDeBloque(contenido, posicionApertura) {
  let profundidad = 0;
  for (let i = posicionApertura; i < contenido.length; i++) {
    const c = contenido[i];
    if (c === '{') profundidad++;
    else if (c === '}') {
      profundidad--;
      if (profundidad === 0) return i;
    }
  }
  return contenido.length;
}

function numeroDeLinea(contenido, posicion) {
  return contenido.slice(0, posicion).split('\n').length;
}

function chequearAppDeTestSinConfigurar() {
  const violaciones = [];

  for (const regla of REGLAS) {
    const permitidoEnAbsoluto = new Set(regla.permitidoEn.map((p) => path.join(RAIZ, p)));

    for (const dirRelativo of regla.directorios) {
      const dirAbsoluto = path.join(RAIZ, dirRelativo);
      for (const archivo of recorrerArchivos(dirAbsoluto, regla.extensiones)) {
        if (permitidoEnAbsoluto.has(archivo)) continue;

        const contenido = readFileSync(archivo, 'utf-8');
        const rutaRelativa = path.relative(RAIZ, archivo);

        for (const posicion of posicionesDe(contenido, regla.llamadaQueDisparaElChequeo)) {
          const apertura = encontrarAperturaDeBloque(contenido, posicion);
          if (apertura === -1) continue; // no debería pasar en un archivo válido, pero no revienta si pasa.
          const cierre = encontrarCierreDeBloque(contenido, apertura);
          const bloque = contenido.slice(apertura, cierre);

          if (!bloque.includes(regla.llamadaQueTieneQueEstar)) {
            violaciones.push({
              archivo: rutaRelativa,
              linea: numeroDeLinea(contenido, posicion),
              descripcion: regla.descripcion,
              comoCorregir: regla.comoCorregir,
            });
          }
        }
      }
    }
  }

  return violaciones;
}

const violaciones = chequearAppDeTestSinConfigurar();

if (violaciones.length === 0) {
  console.log('OK — toda app de test que se crea queda configurada.');
  process.exit(0);
}

console.error('Apps de test sin configurar encontradas:\n');
for (const v of violaciones) {
  console.error(`  ${v.archivo}:${v.linea} — ${v.descripcion}`);
  console.error(`    → ${v.comoCorregir}\n`);
}
process.exit(1);
