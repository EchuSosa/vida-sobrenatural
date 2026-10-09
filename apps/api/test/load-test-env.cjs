// Carga apps/api/.env.test antes de correr los tests de integración/e2e —
// apunta DATABASE_URL a una base de datos de test separada (Constitución,
// Principio VI).
//
// H-130: corre dentro de CADA worker de Jest, antes de cada archivo de test
// — es el proceso que efectivamente escribe y borra, así que es acá donde se
// verifica que los dos destinos son de test: la base, y la carpeta de
// archivos (con el token de la corrida, que el worker hereda del
// globalSetup).
const { cargarEntornoDeTest } = require('./entorno-de-test.cjs');
const { verificarDestinoDeTest } = require('../../../scripts/destino-de-test.cjs');

cargarEntornoDeTest();
verificarDestinoDeTest(process.env.STORAGE_DIR, 'STORAGE_DIR');

// spec 014 (D222): la integración nunca sale a la red a ubicar direcciones —
// usa el geocodificador falso aunque `.env.test` no lo diga.
process.env.GEOCODIFICADOR = 'falso';
