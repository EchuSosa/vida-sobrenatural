'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');
const { Client } = require('pg');

/**
 * H-78/D124 (docs/05-decisiones.md): pieza compartida entre
 * apps/web/playwright.config.ts y apps/backoffice/playwright.config.ts
 * (Principio XI — no se duplica). Antes de esto cada suite le pegaba a la
 * API y la base de DESARROLLO; esto ya la rompió tres veces (H-17, H-67, la
 * Palabra Profética vigente borrada a mitad de una corrida). Deja lista
 * vidasobrenatural_e2e antes de levantar los `webServer` de cada config:
 * crearla si falta, resetearla (H-97: sembrar solo no repara, salta lo que
 * ya existe) y sembrar los fixtures de e2e.
 *
 * CJS plano (require/module.exports, sin import.meta), mismo estilo que
 * apps/api/test/global-setup.cjs (H-59, el modelo): el loader de
 * configuración de Playwright carga playwright.config.ts con require(), no
 * con un import() real — un módulo ESM (import.meta.url) revienta ahí con
 * "Cannot use 'import.meta' outside a module".
 */

const RAIZ_API = path.join(__dirname, '..', 'apps', 'api');
const RUTA_ENV_E2E = path.join(RAIZ_API, '.env.e2e');
const NOMBRE_BASE_E2E = 'vidasobrenatural_e2e';

/**
 * Parser mínimo a propósito (sin depender de `dotenv`, que solo está
 * instalado dentro de apps/api — este script vive en scripts/, otro
 * ámbito de resolución de node_modules con pnpm). Mismo formato simple que
 * ya usan .env.test/.env.e2e: `CLAVE="valor"` o `CLAVE=valor`, una por
 * línea, `#` para comentarios.
 */
/** @returns {Record<string, string>} */
function leerEnvE2e() {
  if (!fs.existsSync(RUTA_ENV_E2E)) {
    throw new Error(
      `No existe ${RUTA_ENV_E2E}. Creá apps/api/.env.e2e siguiendo la convención de apps/api/.env.test (ver docs/11-setup-local.md).`,
    );
  }
  const contenido = fs.readFileSync(RUTA_ENV_E2E, 'utf-8');
  /** @type {Record<string, string>} */
  const env = {};
  for (const lineaCruda of contenido.split('\n')) {
    const linea = lineaCruda.trim();
    if (!linea || linea.startsWith('#')) continue;
    const posIgual = linea.indexOf('=');
    if (posIgual === -1) continue;
    const clave = linea.slice(0, posIgual).trim();
    let valor = linea.slice(posIgual + 1).trim();
    if ((valor.startsWith('"') && valor.endsWith('"')) || (valor.startsWith("'") && valor.endsWith("'"))) {
      valor = valor.slice(1, -1);
    }
    env[clave] = valor;
  }
  return env;
}

/**
 * La guarda mecánica de H-78 — no una convención en un comentario, la
 * lección de H-61 es que si no es mecánico no dura. Aborta ruidoso si
 * DATABASE_URL no es exactamente vidasobrenatural_e2e; no limpia, no sigue.
 */
function verificarBaseE2e(databaseUrl) {
  const url = new URL(databaseUrl);
  const nombreBase = url.pathname.replace(/^\//, '');
  if (nombreBase !== NOMBRE_BASE_E2E) {
    throw new Error(
      `[e2e-base-datos] DATABASE_URL apunta a "${nombreBase}", no a "${NOMBRE_BASE_E2E}". ` +
        'Los e2e de Playwright NUNCA corren contra otra base (H-78: ya rompió la de desarrollo tres veces). ' +
        'Revisá apps/api/.env.e2e — se aborta la corrida.',
    );
  }
  return nombreBase;
}

async function asegurarBaseDatos(databaseUrl) {
  const nombreBase = verificarBaseE2e(databaseUrl);

  const urlAdmin = new URL(databaseUrl);
  urlAdmin.pathname = '/postgres';

  const cliente = new Client({ connectionString: urlAdmin.toString() });
  await cliente.connect();
  try {
    const { rowCount } = await cliente.query('SELECT 1 FROM pg_database WHERE datname = $1', [nombreBase]);
    if (rowCount === 0) {
      await cliente.query(`CREATE DATABASE "${nombreBase.replace(/"/g, '""')}"`);
      console.log(`[e2e-base-datos] Base "${nombreBase}" creada.`);
    }
  } finally {
    await cliente.end();
  }
}

/**
 * Crea/resetea/siembra vidasobrenatural_e2e. Llamada desde el
 * `globalSetup` de cada suite (apps/web y apps/backoffice) — corre una vez
 * por corrida, antes de levantar cualquier `webServer`.
 */
async function prepararBaseE2e() {
  const envE2e = leerEnvE2e();
  const databaseUrl = envE2e.DATABASE_URL;
  if (!databaseUrl) throw new Error('[e2e-base-datos] apps/api/.env.e2e no define DATABASE_URL.');
  verificarBaseE2e(databaseUrl);
  await asegurarBaseDatos(databaseUrl);

  const env = { ...process.env, ...envE2e };

  // H-97: sembrar solo (prisma.config.ts declara seed.ts) no repara lo que
  // ya existe, así que "reset" (borra+migra) es lo único que deja la base
  // en un estado conocido antes de cada corrida. `migrate reset --force`
  // en la versión instalada (Prisma 7.10.0) NO corre el seed configurado
  // pese a tenerlo declarado — verificado corriendo el comando y viendo la
  // base vacía después — así que se encadena `prisma db seed` a mano
  // (mismo ajuste que apps/api/package.json db:reset).
  execSync('npx prisma migrate reset --force && npx prisma db seed', {
    cwd: RAIZ_API,
    env,
    stdio: 'inherit',
  });

  // H-34/specs/003-contenido-institucional: fixtures de e2e (admin,
  // pastor, otro-rol) que no forman parte del seed mínimo ni del de demo.
  execSync('npx tsx scripts/sembrar-e2e-admin.ts', {
    cwd: RAIZ_API,
    env,
    stdio: 'inherit',
  });
}

module.exports = { leerEnvE2e, verificarBaseE2e, asegurarBaseDatos, prepararBaseE2e };
