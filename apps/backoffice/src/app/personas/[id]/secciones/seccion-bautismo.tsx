import { apiFetch, type BautismoDePersona } from '@vida-sobrenatural/shared-types';
import { auth, tienePermisoSesion } from '../../../../auth';
import { BautismoPersonaCliente } from './bautismo-persona-cliente';

/**
 * spec 010, T049 y T050 (FR-021, FR-022; Historia 5): la sección "Bautismo"
 * del Perfil de Persona (IMPLEMENTACION §2.6: las acciones nuevas sobre una
 * Persona van en su sección). Dice su situación (Vida Nueva, habilitada por
 * quién, bautizada, pedido abierto) y, para el Admin, "Habilitar el
 * bautismo" / "Quitar la habilitación" y "Pedir el bautismo en su nombre".
 * El Pastor la ve en solo lectura. Carga y falla sola (la página la envuelve).
 */
export async function SeccionBautismo({ personaId, apiToken }: { personaId: string; apiToken: string }) {
  const session = await auth();
  const datos = await apiFetch<BautismoDePersona>(`/bautismo/personas/${encodeURIComponent(personaId)}`, {
    headers: { Authorization: `Bearer ${apiToken}` },
    cache: 'no-store',
  });
  return (
    <BautismoPersonaCliente
      personaId={personaId}
      datos={datos}
      apiToken={apiToken}
      puedeHabilitar={session ? tienePermisoSesion(session, 'bautismo.habilitar') : false}
      puedePedirEnNombre={session ? tienePermisoSesion(session, 'bautismo.crear_en_nombre') : false}
    />
  );
}
