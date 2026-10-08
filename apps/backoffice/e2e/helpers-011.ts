import type { EventoDetalle } from '@vida-sobrenatural/shared-types';
import { apiComo, EMAIL_ADMIN } from './helpers';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3333';

/**
 * spec 011 — helpers de los e2e de Eventos del backoffice. Los Eventos se
 * llaman `e2e-…` para que `limpiar-e2e.ts` los borre.
 */
export async function crearEventoPorApi(datos: Record<string, unknown> = {}): Promise<EventoDetalle> {
  const sedes: { id: string }[] = await (await fetch(`${API_BASE_URL}/sedes`)).json();
  return apiComo<EventoDetalle>(EMAIL_ADMIN, 'POST', '/eventos', {
    sedeId: sedes[0].id,
    nombre: `e2e-evento-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    descripcion: 'Evento de prueba de e2e.',
    inicio: new Date(Date.now() + 30 * 86_400_000).toISOString(),
    requiereInscripcion: true,
    cupo: 10,
    ...datos,
  });
}

/** Un año civil que siempre está en el futuro, para cargar fechas en el formulario. */
export const ANIO_FUTURO = String(new Date().getFullYear() + 1);
