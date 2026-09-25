const { borrarDestinoDeTest } = require('../../../scripts/destino-de-test.cjs');

/**
 * H-130: el único borrado de archivos de la suite de integración, y pasa
 * por la guarda — borra STORAGE_DIR solo si es la carpeta temporal que creó
 * ESTA corrida (marca + token). Corre en el proceso principal de Jest, el
 * mismo que corrió el globalSetup, así que ve el mismo process.env.
 */
module.exports = async function globalTeardown() {
  borrarDestinoDeTest(process.env.STORAGE_DIR, 'STORAGE_DIR');
};
