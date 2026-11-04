import { fechasDeServicio, hoyEnArgentina } from '@vida-sobrenatural/shared-types';
import { test, expect, apiComo, crearPersona, loguearseComoAdminE2E, EMAIL_ADMIN } from './helpers';

/**
 * QA ronda 2, BUG-08: al quitar un día de servicio, el diálogo dice "Lo que ya se publicó no se
 * borra", pero las fechas publicadas de esa regla se suspenden y a cada persona con turno le llega
 * "ese día no hay servicio" (spec 017, casos borde). El Admin confirma creyendo que el rol queda.
 * Se arma un Ministerio propio para no chocar con los demás e2e de turnos.
 */
test('quitar un día con una fecha publicada avisa en el diálogo que se suspende y se avisa', async ({ page }) => {
  test.slow();
  const sufijo = Date.now();
  const { id } = await apiComo<{ id: string }>(EMAIL_ADMIN, 'POST', '/ministerios', { nombre: `e2e-qa-regla-${sufijo}`, descripcion: 'Ministerio de QA' });
  const persona = await crearPersona(`e2e-qa-regla-${sufijo}@example.com`, { nombre: 'Rita', apellido: 'Regla' });
  await apiComo(EMAIL_ADMIN, 'POST', `/ministerios/${id}/miembros`, { personaId: persona.id, celulaId: null });
  await apiComo(EMAIL_ADMIN, 'POST', `/ministerios/${id}/dias-de-servicio`, { frecuencia: 'semanal', diaSemana: 0, posicionEnMes: null });
  const domingo = fechasDeServicio([{ frecuencia: 'semanal', diaSemana: 0 }], 1, hoyEnArgentina())[0];
  await apiComo(EMAIL_ADMIN, 'POST', `/ministerios/${id}/fechas/${domingo}/turnos`, { personaId: persona.id, celulaId: null });
  await apiComo(EMAIL_ADMIN, 'POST', `/ministerios/${id}/fechas/${domingo}/publicacion`);

  await loguearseComoAdminE2E(page);
  await page.goto(`/ministerios/${id}`);
  const seccion = page.getByRole('region', { name: 'Días de servicio' });
  await seccion.getByRole('button', { name: 'Quitar: Todos los domingos' }).click();
  const dialogo = page.getByRole('alertdialog');
  await expect(dialogo).toContainText('¿Quitar «Todos los domingos»?');
  // Lo que pasa de verdad: la fecha publicada se suspende y la persona recibe un aviso.
  await expect(dialogo).toContainText(/aviso/i, { timeout: 3000 });
  await expect(dialogo).not.toContainText('Lo que ya se publicó no se borra');
});
