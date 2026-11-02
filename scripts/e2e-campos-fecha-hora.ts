import type { Locator, Page } from '@playwright/test';

/**
 * H-R10: cómo se completan en los e2e los campos propios de fecha y hora de
 * packages/ui (`CampoFecha`: Día / Mes / Año; `CampoHora`: Hora y Minutos).
 * Cada campo es un grupo (`<fieldset>` con su leyenda), así que se busca por
 * rol `group` y el nombre del campo. Compartido por los e2e de apps/web y
 * apps/backoffice (Principio XI), como e2e-fallas-en-consola.ts.
 */

/** El grupo de un campo por su nombre ("Fecha de nacimiento", "Desde"…). */
export function campo(pagina: Page | Locator, nombre: string): Locator {
  return pagina.getByRole('group', { name: nombre, exact: true });
}

/** Completa un `CampoFecha` con una fecha `AAAA-MM-DD`. */
export async function completarFecha(grupo: Locator, fecha: string) {
  const [anio, mes, dia] = fecha.split('-');
  await grupo.getByLabel('Día', { exact: true }).fill(String(Number(dia)));
  await grupo.getByLabel('Mes', { exact: true }).selectOption(String(Number(mes)));
  await grupo.getByLabel('Año', { exact: true }).fill(anio);
}

/**
 * Elige día, desde y hasta en un `EditorDeFranjas` (sin tocar "Agregar franja").
 * QA ronda 1, BUG-02 (D247): el editor arranca sin nada elegido, así que todo
 * test que carga una franja la elige explícitamente.
 */
export async function elegirFranja(ambito: Page | Locator, dia: string, desde: string, hasta: string) {
  await ambito.getByLabel('Día', { exact: true }).first().selectOption({ label: dia });
  await elegirHora(campo(ambito, 'Desde').first(), desde);
  await elegirHora(campo(ambito, 'Hasta').first(), hasta);
}

/** Elige una hora `HH:mm` en un `CampoHora`. */
export async function elegirHora(grupo: Locator, hora: string) {
  const [hh, mm] = hora.split(':');
  await grupo.getByLabel('Hora', { exact: true }).selectOption(hh);
  await grupo.getByLabel('Minutos', { exact: true }).selectOption(mm);
}
