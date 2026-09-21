const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.test') });
const { execSync } = require('node:child_process');
const { Client } = require('pg');

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
