import { notFound } from 'next/navigation';
import { ApiError, apiFetch, type PerfilPersona } from '@vida-sobrenatural/shared-types';
import { requerirPermiso } from '../../../../auth';
import { EditarPersonaCliente } from './editar-persona-cliente';

/**
 * spec 013, Historia 7 (T082, FR-057): "Editar datos" de una Persona, con el
 * mismo formulario del alta de la 006 (`CamposPersona`) y sus datos actuales.
 * Solo con `personas.editar` (Admin; el Pastor no llega: requerirPermiso).
 * Cargando y error: loading.tsx/error.tsx; una Persona que no existe, el
 * not-found del perfil.
 */
export default async function EditarPersonaPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requerirPermiso('personas.editar');
  const { id } = await params;
  const auth = { headers: { Authorization: `Bearer ${session.apiToken}` }, cache: 'no-store' as const };
  let perfil: PerfilPersona;
  try {
    perfil = await apiFetch<PerfilPersona>(`/personas/${id}/perfil`, auth);
  } catch (e) {
    if (e instanceof ApiError && e.code === 'NO_ENCONTRADO') notFound();
    throw e;
  }
  const sedes = (await apiFetch<Array<{ id: string; nombre: string }>>('/sedes', { cache: 'no-store' })).map((s) => ({ id: s.id, nombre: s.nombre }));
  return (
    <EditarPersonaCliente
      perfil={perfil}
      // Si su Sede ya no está activa, igual se muestra elegida (y se puede cambiar).
      sedeActualInactiva={sedes.some((s) => s.id === perfil.sede.id) ? null : { id: perfil.sede.id, nombre: perfil.sede.nombre }}
      sedes={sedes}
      apiToken={session.apiToken}
    />
  );
}
