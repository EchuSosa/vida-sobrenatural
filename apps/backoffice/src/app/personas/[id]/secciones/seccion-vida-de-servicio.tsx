import { apiFetch, type VidaDeServicioDePersona } from '@vida-sobrenatural/shared-types';
import { auth, tienePermisoSesion } from '../../../../auth';
import { VidaDeServicioPersonaCliente } from './vida-de-servicio-persona-cliente';

/**
 * spec 008, T033 (FR-013, D97, D143): la sección "Vida de Servicio" del
 * Perfil de Persona (IMPLEMENTACION §2.6: las acciones nuevas sobre una
 * Persona van en su sección). Dice en qué está y, con
 * `vida_servicio.inscribir_en_nombre` (solo Admin), "Pedir Vida de Servicio
 * en su nombre" — deshabilitado con la razón si no cumple el requisito. El
 * Pastor la ve en solo lectura. Carga y falla sola (la página la envuelve).
 */
export async function SeccionVidaDeServicio({ personaId, apiToken }: { personaId: string; apiToken: string }) {
  const session = await auth();
  const vs = await apiFetch<VidaDeServicioDePersona>(`/personas/${encodeURIComponent(personaId)}/vida-de-servicio`, {
    headers: { Authorization: `Bearer ${apiToken}` },
    cache: 'no-store',
  });
  const puedePedir = session ? tienePermisoSesion(session, 'vida_servicio.inscribir_en_nombre') : false;
  const puedeVerSolicitudes = session ? tienePermisoSesion(session, 'solicitudes.ver') : false;
  return (
    <VidaDeServicioPersonaCliente
      personaId={personaId}
      nombre={`${vs.persona.nombre} ${vs.persona.apellido}`}
      vs={vs}
      apiToken={apiToken}
      puedePedir={puedePedir}
      puedeVerSolicitudes={puedeVerSolicitudes}
    />
  );
}
