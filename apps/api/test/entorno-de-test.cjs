const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');
const { verificarBaseDeTest } = require('../../../scripts/destino-de-test.cjs');

/**
 * H-130: carga apps/api/.env.test y verifica que DATABASE_URL apunta a la
 * base de test — un solo lugar para globalSetup (proceso principal) y
 * load-test-env.cjs (cada worker). dotenv NO pisa una variable ya exportada
 * en la terminal, así que se verifica el valor EFECTIVO y se informa de
 * dónde vino: si difiere del archivo, vino de la terminal.
 */
function cargarEntornoDeTest() {
  const rutaEnvTest = path.join(__dirname, '..', '.env.test');
  dotenv.config({ path: rutaEnvTest });
  const desdeArchivo = fs.existsSync(rutaEnvTest) ? dotenv.parse(fs.readFileSync(rutaEnvTest)).DATABASE_URL : undefined;
  const origen =
    process.env.DATABASE_URL === desdeArchivo ? 'apps/api/.env.test' : 'la terminal: está exportada y dotenv no la pisa';
  verificarBaseDeTest(process.env.DATABASE_URL, origen);
}

module.exports = { cargarEntornoDeTest };
