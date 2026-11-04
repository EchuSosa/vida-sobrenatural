import { fechasDeServicio, formatearDiaDeServicio, hoyEnArgentina } from '@vida-sobrenatural/shared-types';
import { test, expect, apiComo, crearPersona, loguearseComoAdminE2E, EMAIL_ADMIN } from './helpers';

/**
 * QA ronda 2, BUG-09: el Admin suspende una fecha publicada ("Este día no hay") y la persona con
 * turno recibe el aviso de que no hay servicio. Si después la vuelve a habilitar, el turno reaparece
 * publicado pero nadie se lo avisa: el último aviso que tiene dice que ese día no va.
 */
type Aviso = { evento: string; fecha: string };

test.fail('volver a habilitar una fecha publicada le avisa a quien tenía turno', async ({ page }) => {
  test.slow();
  const sufijo = Date.now();
  const { id } = await apiComo<{ id: string }>(EMAIL_ADMIN, 'POST', '/ministerios', { nombre: `e2e-qa-habilitar-${sufijo}`, descripcion: 'Ministerio de QA' });
  const email = `e2e-qa-habilitar-${sufijo}@example.com`;
  const persona = await crearPersona(email, { nombre: 'Hugo', apellido: 'Habilitar' });
  await apiComo(EMAIL_ADMIN, 'POST', `/ministerios/${id}/miembros`, { personaId: persona.id, celulaId: null });
  await apiComo(EMAIL_ADMIN, 'POST', `/ministerios/${id}/dias-de-servicio`, { frecuencia: 'semanal', diaSemana: 0, posicionEnMes: null });
  const domingo = fechasDeServicio([{ frecuencia: 'semanal', diaSemana: 0 }], 1, hoyEnArgentina())[0];
  await apiComo(EMAIL_ADMIN, 'POST', `/ministerios/${id}/fechas/${domingo}/turnos`, { personaId: persona.id, celulaId: null });
  await apiComo(EMAIL_ADMIN, 'POST', `/ministerios/${id}/fechas/${domingo}/publicacion`);
  await apiComo(EMAIL_ADMIN, 'POST', `/ministerios/${id}/fechas/${domingo}/suspension`);
  const antes = (await apiComo<{ items: Aviso[] }>(email, 'GET', '/avisos')).items.length;

  await loguearseComoAdminE2E(page);
  await page.goto(`/ministerios/${id}`);
  const fecha = formatearDiaDeServicio(domingo, 'es');
  await page.getByRole('region', { name: 'Días de servicio' }).getByRole('button', { name: `Volver a habilitar: ${fecha}` }).click();
  await expect(page.getByText(`Listo: el ${fecha} vuelve a estar en la grilla.`)).toBeVisible();

  // El turno vuelve a estar publicado...
  const turnos = await apiComo<Array<{ dia: string }>>(email, 'GET', '/turnos/me');
  expect(turnos.map((t) => t.dia)).toContain(domingo);
  // ...y la persona tiene que enterarse de que ahora sí sirve.
  await expect.poll(async () => (await apiComo<{ items: Aviso[] }>(email, 'GET', '/avisos')).items.length, { timeout: 5000 }).toBeGreaterThan(antes);
});
