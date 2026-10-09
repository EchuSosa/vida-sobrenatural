import { test, expect } from './helpers';
import { api, tokenDe } from './helpers-006';
import { crearPersonaActiva, EMAIL_ADMIN_E2E } from './helpers-011';
import { esperarMensaje, mensajesPara } from '../../../scripts/e2e-mailpit';
import { leerEnvE2e } from '../../../scripts/e2e-base-datos.cjs';

/**
 * spec 012, T040 — un aviso importante llega por mail: el Admin rechaza por la
 * API el pedido de Vida Nueva de una Persona `e2e-` con email; llega UN mail a
 * Mailpit con el asunto sin datos sensibles, versión de texto y el botón a
 * Mi camino de la web (SC-001, US3-1). La acción responde sin esperar al mail
 * (US3-5; el caso con un servidor de mail lento está en la integración).
 */
test('rechazar el pedido de Vida Nueva manda un mail con el botón a Mi camino', async ({ baseURL }) => {
  const email = `e2e-avisos-mail-${Date.now()}@example.com`;
  await crearPersonaActiva(baseURL!, email, 'Mail');
  const persona = await tokenDe(baseURL!, email);
  const { id: solicitudId } = await api(persona, 'POST', '/discipulado/solicitudes/me', { franjas: [{ diaSemana: 2, inicio: 19 * 60, fin: 21 * 60 }] });

  const admin = await tokenDe(baseURL!, EMAIL_ADMIN_E2E);
  const inicio = Date.now();
  await api(admin, 'POST', `/discipulado/solicitudes/${solicitudId}/rechazar`);
  expect(Date.now() - inicio).toBeLessThan(5_000);

  const mensaje = await esperarMensaje(email, 1);
  expect(mensaje.Subject).toBe('Hay novedades sobre tu pedido');
  expect(mensaje.Text).toContain('Tu pedido de Vida Nueva no siguió adelante');
  const destino = `${leerEnvE2e().WEB_URL.replace(/\/$/, '')}/mi-camino`;
  expect(mensaje.Text).toContain(destino);
  expect(mensaje.HTML).toContain(`href="${destino}"`);
  // Uno solo, aunque el proceso de mails y el empuje de la acción corran a la vez (FR-023).
  await new Promise((r) => setTimeout(r, 2_000));
  expect(await mensajesPara(email)).toHaveLength(1);
});
