/**
 * spec 006 (research #14, D142): la URL de la web app para enlaces y
 * redirecciones del backoffice — `NEXT_PUBLIC_WEB_APP_URL` (una sola variable
 * para enlaces y QR, specs/IMPLEMENTACION.md §1). Sin ella, el puerto de
 * desarrollo de D104.
 */
export const WEB_APP_URL = (process.env.NEXT_PUBLIC_WEB_APP_URL ?? 'http://localhost:3001').replace(/\/$/, '');

export function urlDeLaWebApp(ruta: string): string {
  return `${WEB_APP_URL}${ruta}`;
}
