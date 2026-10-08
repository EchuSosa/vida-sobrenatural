import { apiFetch, type Sede } from '@vida-sobrenatural/shared-types';
import { requerirPermiso } from '../../../auth';
import { NuevoEventoCliente } from './nuevo-cliente';

/** spec 011, T030 — crear un Evento (FR-010). Solo `eventos.gestionar` (Admin). */
export default async function NuevoEventoPage() {
  const session = await requerirPermiso('eventos.gestionar');
  const sedes = await apiFetch<Sede[]>('/sedes');
  return <NuevoEventoCliente apiToken={session.apiToken} sedes={sedes.map((s) => ({ id: s.id, nombre: s.nombre }))} />;
}
