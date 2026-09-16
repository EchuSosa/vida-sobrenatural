// Carga apps/api/.env.test antes de correr los tests de integración/e2e —
// apunta DATABASE_URL a una base de datos de test separada (Constitución,
// Principio VI).
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.test') });
