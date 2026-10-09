import { test, expect, auditar } from './helpers';
import { API, api, tokenDe } from './helpers-006';

/**
 * D218: el WhatsApp de Secretaría de la Sede. Visitanos muestra "Escribir por
 * WhatsApp" (texto + ícono, D81) con el enlace a wa.me solo si la Sede lo
 * tiene cargado.
 */
test('Visitanos muestra "Escribir por WhatsApp" solo si la Sede tiene el WhatsApp cargado', async ({ page, baseURL }) => {
  const admin = await tokenDe(baseURL!, 'e2e-admin@example.com');
  const sedes: Array<{ id: string; whatsappSecretaria: string | null }> = await (
    await page.request.get(`${API()}/sedes`)
  ).json();
  const sede = sedes[0];
  const anterior = sede.whatsappSecretaria;

  try {
    await api(admin, 'PATCH', `/sedes/${sede.id}`, { whatsappSecretaria: '0221 15 555-0101' });
    await page.goto('/visitanos');
    const boton = page.getByRole('link', { name: 'Escribir por WhatsApp' }).first();
    await expect(boton).toBeVisible();
    await expect(boton).toHaveAttribute('href', 'https://wa.me/5492215550101');
    expect((await auditar(page)).violations).toEqual([]);

    await api(admin, 'PATCH', `/sedes/${sede.id}`, { whatsappSecretaria: '' });
    await page.reload();
    await expect(page.getByRole('link', { name: 'Cómo llegar' }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Escribir por WhatsApp' })).toHaveCount(0);
  } finally {
    await api(admin, 'PATCH', `/sedes/${sede.id}`, { whatsappSecretaria: anterior ?? '' });
  }
});
