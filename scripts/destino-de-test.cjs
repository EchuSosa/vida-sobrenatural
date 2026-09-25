'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');

/**
 * H-130 (revisión manual): la guarda de `verificarBaseE2e` (H-78), aplicada
 * a todo DESTINO de una suite de test — archivos y base. La forma que ya
 * van tres veces (H-111, H-127, H-130): el destino de una operación
 * peligrosa se resuelve por un default silencioso que apunta al entorno de
 * desarrollo. La pregunta no es "¿apunta bien?", es "¿qué pasa si la
 * variable no está — o está exportada en la terminal apuntando a otro
 * lado?". Acá la respuesta es siempre la misma: se aborta, ruidoso, antes
 * de escribir o borrar nada.
 *
 * Carpetas: un destino de test se reconoce por CÓMO NACE, no por su nombre
 * (ninguna lista a mano que se desactualice). Es una carpeta que creó ESTA
 * corrida (`crearDestinoDeTest`, en el globalSetup), dentro del directorio
 * temporal del sistema, con una marca `.destino-de-test` que guarda el
 * token de la corrida. Cualquier otra ruta — sin definir, relativa al repo
 * (`./storage/portadas`, la de desarrollo), en /tmp pero de otra corrida o
 * de otra herramienta, o un symlink que sale de /tmp — no pasa.
 *
 * El token viaja por `process.env` (TOKEN_ENV): el globalSetup de Jest lo
 * escribe antes de levantar los workers, y cada worker lo hereda al
 * nacer. Si un worker no lo ve, la guarda aborta — es el síntoma buscado,
 * no un bug de la guarda: significa que ese proceso no sabe cuál es su
 * destino y no debe tocar ninguno.
 *
 * CJS plano, mismo motivo que e2e-base-datos.cjs (lo carga
 * apps/api/test/*.cjs con require()).
 *
 * Pendientes conocidos, anotados al implementar H-130 (no resueltos acá):
 * - `apps/api/storage/portadas-e2e` (STORAGE_DIR de .env.e2e, los e2e de
 *   Playwright) acumula archivos entre corridas — nada la limpia (1721 al
 *   25/09). No es destructivo; cuando se limpie, ese borrado tiene que
 *   pasar por esta misma guarda, adaptada a Playwright (hoy el destino de
 *   esa suite es una ruta fija, no una carpeta que crea la corrida).
 * - `apps/api/scripts/limpiar-e2e.ts` carga `dotenv/config` (la base de
 *   desarrollo por defecto) y borra por prefijo `e2e-`. Es manual y está
 *   acotado al prefijo, así que queda como está.
 */

const TOKEN_ENV = 'DESTINO_DE_TEST_TOKEN';
const MARCA = '.destino-de-test';
const PREFIJO = 'vs-test-';
const NOMBRE_BASE_TEST = 'vidasobrenatural_test';

function abortar(mensaje) {
  throw new Error(`[destino-de-test] ${mensaje} Se aborta sin escribir ni borrar nada (H-130).`);
}

/**
 * globalSetup: crea la carpeta de esta corrida en el temporal del sistema,
 * con su marca y token, y deja los dos en process.env para los workers.
 * Devuelve la ruta. Pisa un STORAGE_DIR exportado en la terminal a
 * propósito: el destino de una corrida de test lo decide la corrida.
 */
function crearDestinoDeTest(variable) {
  const token = crypto.randomUUID();
  const ruta = fs.mkdtempSync(path.join(os.tmpdir(), PREFIJO));
  fs.writeFileSync(path.join(ruta, MARCA), token);
  process.env[TOKEN_ENV] = token;
  process.env[variable] = ruta;
  return ruta;
}

/**
 * Verifica que `ruta` es un destino de test de ESTA corrida. `nombre` es
 * solo para el mensaje (ej. "STORAGE_DIR"). Devuelve la ruta real.
 */
function verificarDestinoDeTest(ruta, nombre = 'la ruta') {
  if (!ruta) {
    abortar(`${nombre} no está definida — sin destino verificado no hay default posible (ni "./storage/portadas", que es el de desarrollo).`);
  }
  let real;
  try {
    real = fs.realpathSync(ruta);
  } catch {
    abortar(`${nombre}="${ruta}" no existe: no se puede comprobar que sea un destino de test.`);
  }
  const tmpReal = fs.realpathSync(os.tmpdir());
  const relativa = path.relative(tmpReal, real);
  if (!relativa || relativa.startsWith('..') || path.isAbsolute(relativa)) {
    abortar(
      `${nombre}="${ruta}" (${real}) no está dentro del temporal del sistema (${tmpReal}). ` +
        'Un destino de test lo crea la corrida en el temporal; si la exportaste en tu terminal, sacala (unset).',
    );
  }
  const tokenEsperado = process.env[TOKEN_ENV];
  if (!tokenEsperado) {
    abortar(`este proceso no tiene ${TOKEN_ENV}: no sabe cuál es su destino de test (¿corrió el globalSetup, y el worker lo heredó?).`);
  }
  let tokenMarca;
  try {
    tokenMarca = fs.readFileSync(path.join(real, MARCA), 'utf-8');
  } catch {
    abortar(`${nombre}="${ruta}" no tiene la marca ${MARCA}: no la creó una corrida de test.`);
  }
  if (tokenMarca !== tokenEsperado) {
    abortar(`${nombre}="${ruta}" es un destino de test, pero de OTRA corrida (el token de su marca no es el de esta).`);
  }
  return real;
}

/** La única forma de borrar un destino de test: verifica, después borra. */
function borrarDestinoDeTest(ruta, nombre) {
  const real = verificarDestinoDeTest(ruta, nombre);
  fs.rmSync(real, { recursive: true, force: true });
}

/**
 * La de verificarBaseE2e, para la base de la suite de integración de la
 * API. Mira el VALOR efectivo, no de dónde vino: dotenv no pisa una
 * variable ya exportada, así que un DATABASE_URL en la terminal le gana a
 * .env.test sin que nada avise — por eso `origen` (lo calcula quien carga
 * el entorno) aparece en el mensaje.
 */
function verificarBaseDeTest(databaseUrl, origen = 'el entorno') {
  if (!databaseUrl) {
    abortar('DATABASE_URL no está definida para la suite de integración (¿falta apps/api/.env.test?).');
  }
  let nombreBase;
  try {
    nombreBase = new URL(databaseUrl).pathname.replace(/^\//, '');
  } catch {
    abortar('DATABASE_URL no es una URL válida.');
  }
  if (nombreBase !== NOMBRE_BASE_TEST) {
    abortar(
      `DATABASE_URL apunta a "${nombreBase}", no a "${NOMBRE_BASE_TEST}" (vino de ${origen}). ` +
        'Si está exportada en tu terminal, dotenv NO la reemplaza con la de apps/api/.env.test: sacala (unset DATABASE_URL).',
    );
  }
  return nombreBase;
}

module.exports = { TOKEN_ENV, crearDestinoDeTest, verificarDestinoDeTest, borrarDestinoDeTest, verificarBaseDeTest };
