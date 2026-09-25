const path = require('node:path');
const { execSync } = require('node:child_process');
const { Client } = require('pg');
const { cargarEntornoDeTest } = require('./entorno-de-test.cjs');
const { crearDestinoDeTest } = require('../../../scripts/destino-de-test.cjs');

/**
 * H-59 (revisión manual): la suite de integración necesita su propia base
 * (Constitución, Principio VI) — hasta ahora había que crearla a mano antes
 * de la primera corrida, un paso que se olvidaba o se perdía con
 * `docker compose down -v`. Se conecta a la base de administración
 * "postgres" (mismas credenciales que DATABASE_URL, pero esa base todavía
 * puede no existir) para crear `vidasobrenatural_test` si falta, y siempre
 * corre `prisma migrate deploy` (no-op si ya está al día) para que nunca
 * quede desactualizada. Corre una sola vez por corrida — Jest ejecuta
 * `globalSetup` en el proceso principal, antes de levantar los workers.
 */
module.exports = async function globalSetup() {
  // H-130: antes de crear o migrar nada — este mismo proceso corre
  // `prisma migrate deploy` contra DATABASE_URL, y una exportada en la
  // terminal le gana a .env.test (dotenv no la pisa).
  cargarEntornoDeTest();
  // H-130: la carpeta de archivos de ESTA corrida, en el temporal del
  // sistema, con marca y token. Se escribe en process.env ANTES de que Jest
  // levante los workers, que la heredan al nacer; pisa un STORAGE_DIR
  // exportado en la terminal a propósito. La borra global-teardown.cjs.
  crearDestinoDeTest('STORAGE_DIR');
  const url = new URL(process.env.DATABASE_URL);
  const nombreBase = url.pathname.replace(/^\//, '');

  const urlAdmin = new URL(url.toString());
  urlAdmin.pathname = '/postgres';

  const cliente = new Client({ connectionString: urlAdmin.toString() });
  await cliente.connect();
  try {
    const { rowCount } = await cliente.query('SELECT 1 FROM pg_database WHERE datname = $1', [nombreBase]);
    if (rowCount === 0) {
      await cliente.query(`CREATE DATABASE "${nombreBase.replace(/"/g, '""')}"`);
      console.log(`[global-setup] Base "${nombreBase}" creada.`);
    }
  } finally {
    await cliente.end();
  }

  execSync('npx prisma migrate deploy', {
    cwd: path.join(__dirname, '..'),
    env: process.env,
    stdio: 'inherit',
  });
};
