import { test, expect, apiComo, EMAIL_ADMIN } from './helpers';
import { EMAIL_LIDER_1, crearEdicionPorApi, crearPersonaApta, inscribirPorApi, inscripcionDe } from './helpers-008';

/**
 * QA ronda 2, BUG-14: en el Inicio del backoffice, "N bajas pedidas para confirmar" (discipulados de
 * Vida Nueva) también cuenta las bajas propuestas en Vida de Servicio, que ya tienen su propia línea.
 * El enlace lleva a /grupos?pendiente=baja, que filtra Vida Nueva y queda vacío.
 */
type Pendientes = { bajasPropuestas: { cantidad: number } };

test('una baja propuesta en Vida de Servicio no suma a las bajas de discipulado del Inicio', async () => {
  const sufijo = Date.now();
  const grupoId = await crearEdicionPorApi({ nombre: `e2e-qa-bajas-${sufijo}` });
  const persona = await crearPersonaApta(`e2e-qa-bajas-${sufijo}@example.com`, 'Bea', 'Bajas');
  await inscribirPorApi(persona.id, grupoId);
  const inscripcionId = await inscripcionDe(grupoId, persona.id);

  const antes = (await apiComo<Pendientes>(EMAIL_ADMIN, 'GET', '/discipulado/pendientes-admin')).bajasPropuestas.cantidad;
  await apiComo(EMAIL_LIDER_1, 'POST', `/vida-de-servicio/mis-grupos/${grupoId}/inscripciones/${inscripcionId}/baja/proponer`, { tipo: 'abandono', comentario: 'QA' });
  const despues = (await apiComo<Pendientes>(EMAIL_ADMIN, 'GET', '/discipulado/pendientes-admin')).bajasPropuestas.cantidad;

  expect(despues).toBe(antes);
});
