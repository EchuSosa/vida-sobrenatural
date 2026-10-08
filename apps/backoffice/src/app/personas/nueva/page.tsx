import { apiFetch } from '@vida-sobrenatural/shared-types';
import { requerirPermiso } from '../../../auth';
import { AltaPersonaCliente } from './alta-persona-cliente';

/**
 * spec 006, T079 (FR-031 a FR-036, FR-039; Historia 5): "Dar de alta una
 * persona" — una sola página con secciones (D94 es para el auto-registro).
 * Solo con `personas.alta` (Admin). Cargando y error: loading.tsx/error.tsx.
 */
export default async function NuevaPersonaPage() {
  const session = await requerirPermiso('personas.alta');
  const sedes = await apiFetch<Array<{ id: string; nombre: string }>>('/sedes', { cache: 'no-store' });
  return <AltaPersonaCliente sedes={sedes.map((s) => ({ id: s.id, nombre: s.nombre }))} apiToken={session.apiToken} />;
}
