import { apiFetch, type MinisterioDePersona, type MinisterioParaPostularse } from '@vida-sobrenatural/shared-types';
import { auth, tienePermisoSesion } from '../../../../auth';
import { MinisterioPersonaCliente } from './ministerio-persona-cliente';

/**
 * spec 009 (FR-024, FR-016; IMPLEMENTACION §2.6): la sección "Ministerio" del
 * Perfil de Persona — dónde sirve hoy, su postulación en revisión y su
 * historial. Con `postulaciones.crear_en_nombre` (Admin), "Postular a un
 * Ministerio" en su nombre (D97): la acción sobre una Persona va en su
 * sección, no en `personas-cliente.tsx`. El Pastor la ve en solo lectura.
 */
export async function SeccionMinisterios({ personaId, apiToken }: { personaId: string; apiToken: string }) {
  const session = await auth();
  const headers = { Authorization: `Bearer ${apiToken}` };
  const puedePostular = session ? tienePermisoSesion(session, 'postulaciones.crear_en_nombre') : false;
  const [datos, ministerios] = await Promise.all([
    apiFetch<MinisterioDePersona>(`/personas/${encodeURIComponent(personaId)}/ministerio`, { headers, cache: 'no-store' }),
    // Los disponibles con sus áreas (los mismos que ve la Persona): solo si va a postular.
    puedePostular ? apiFetch<MinisterioParaPostularse[]>('/ministerios/me/disponibles', { headers, cache: 'no-store' }) : Promise.resolve([]),
  ]);
  return (
    <MinisterioPersonaCliente
      personaId={personaId}
      nombre={`${datos.persona.nombre} ${datos.persona.apellido}`}
      datos={datos}
      ministerios={ministerios}
      apiToken={apiToken}
      puedePostular={puedePostular}
    />
  );
}
