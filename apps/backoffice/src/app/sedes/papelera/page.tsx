import { requerirPermiso, tienePermisoSesion } from '../../../auth';
import { apiFetch, type Sede } from '@vida-sobrenatural/shared-types';
import { PapeleraCliente } from './papelera-cliente';

type ColumnaOrden = 'nombre' | 'eliminadoEn';

/**
 * D119: papelera de Sedes, del Admin. H-60/H-43 (ronda 7): Server
 * Component. H-129/T036: entrar pide `sedes.papelera.ver` ANTES de pedir
 * los datos (404 si no lo tiene, FR-016), y `GET /sedes/papelera` exige el
 * mismo permiso en la API (Principio V, T064). Hasta H-129 esto decía
 * "gateado por rol en el backend" y no lo estaba: la API la devolvía a
 * cualquiera y la pantalla dejaba entrar a cualquier sesión. Cualquier otro
 * error de la API cae en error.tsx (reintentar).
 *
 * H-88: orden (columna + dirección) en la URL, mismo patrón que
 * sedes-cliente.tsx — el orden en sí se resuelve acá (Server Component),
 * ordenar en memoria alcanza con el volumen de hoy (D126).
 */
export default async function PapeleraSedesPage({
  searchParams,
}: {
  searchParams: Promise<{ orden?: string; dir?: string; q?: string }>;
}) {
  const session = await requerirPermiso('sedes.papelera.ver');
  const { orden: ordenParam, dir, q } = await searchParams;
  const ordenColumna: ColumnaOrden = ordenParam === 'eliminadoEn' ? 'eliminadoEn' : 'nombre';
  const ordenDireccion: 'asc' | 'desc' = dir === 'desc' ? 'desc' : 'asc';
  const busqueda = (q ?? '').trim().toLocaleLowerCase('es');

  const sedes = await apiFetch<Sede[]>('/sedes/papelera', {
    headers: { Authorization: `Bearer ${session.apiToken}` },
  });

  const sedesFiltradas = busqueda ? sedes.filter((sede) => sede.nombre.toLocaleLowerCase('es').includes(busqueda)) : sedes;
  const sedesOrdenadas = [...sedesFiltradas].sort((a, b) => {
    const cmp =
      ordenColumna === 'eliminadoEn'
        ? (a.eliminadoEn ?? '').localeCompare(b.eliminadoEn ?? '')
        : a.nombre.localeCompare(b.nombre, 'es');
    return ordenDireccion === 'asc' ? cmp : -cmp;
  });

  return (
    <PapeleraCliente
      sedes={sedesOrdenadas}
      orden={{ columna: ordenColumna, direccion: ordenDireccion }}
      apiToken={session.apiToken}
      puedeGestionar={tienePermisoSesion(session, 'sedes.gestionar')}
    />
  );
}
