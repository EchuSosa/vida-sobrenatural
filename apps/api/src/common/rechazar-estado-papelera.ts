import { AppException } from './errors/app-exception.js';

/**
 * H-129: `GET /sedes` y `GET /libros` son públicos a propósito, y la
 * papelera (D119) es del Admin — así que la papelera tiene su propia ruta
 * protegida (`/sedes/papelera`, `/libros/papelera`) y el endpoint público
 * rechaza `estado=papelera` en vez de ignorarlo. Un fallback silencioso a
 * `activas` haría que un cliente viejo mostrara registros activos como si
 * fueran la papelera; un 400 con el campo lo hace evidente.
 */
export function rechazarEstadoPapelera(estado: string | undefined): void {
  if (estado === 'papelera') {
    throw new AppException('VALIDACION', 400, 'La papelera no se pide con ?estado=papelera: es GET /<recurso>/papelera, solo Admin.', [
      { campo: 'estado', code: 'ESTADO_INVALIDO' },
    ]);
  }
}
