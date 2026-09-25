import Link from 'next/link';
import { requerirSesion } from '../../../auth';
import { apiFetch, ApiError, type Sede } from '@vida-sobrenatural/shared-types';
import { PapeleraCliente } from './papelera-cliente';

type ColumnaOrden = 'nombre' | 'eliminadoEn';

/**
 * D119: papelera de Sedes, para el Admin. H-60/H-43 (ronda 7): Server
 * Component — GET /sedes?estado=papelera pasa al servidor. Gateado por rol
 * en el backend (Principio V); acá se distingue el 403 (SIN_PERMISO) del
 * resto: no es un error transitorio, "Reintentar" (error.tsx) no serviría
 * de nada — se muestra el motivo directamente, sin ofrecer un botón que no
 * va a arreglar nada.
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
  const session = await requerirSesion();
  const { orden: ordenParam, dir, q } = await searchParams;
  const ordenColumna: ColumnaOrden = ordenParam === 'eliminadoEn' ? 'eliminadoEn' : 'nombre';
  const ordenDireccion: 'asc' | 'desc' = dir === 'desc' ? 'desc' : 'asc';
  const busqueda = (q ?? '').trim().toLocaleLowerCase('es');

  let sedes: Sede[];
  try {
    sedes = await apiFetch<Sede[]>('/sedes/papelera', {
      headers: { Authorization: `Bearer ${session.apiToken}` },
    });
  } catch (e) {
    if (e instanceof ApiError && e.code === 'SIN_PERMISO') {
      return (
        <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-16 text-center">
          <h1 className="text-2xl font-semibold">Papelera de Sedes</h1>
          <p className="text-muted-foreground">Necesitás el rol Admin para ver la papelera.</p>
          <Link href="/sedes" className="text-sm underline underline-offset-4">
            Volver a Sedes
          </Link>
        </div>
      );
    }
    throw e;
  }

  const sedesFiltradas = busqueda ? sedes.filter((sede) => sede.nombre.toLocaleLowerCase('es').includes(busqueda)) : sedes;
  const sedesOrdenadas = [...sedesFiltradas].sort((a, b) => {
    const cmp =
      ordenColumna === 'eliminadoEn'
        ? (a.eliminadoEn ?? '').localeCompare(b.eliminadoEn ?? '')
        : a.nombre.localeCompare(b.nombre, 'es');
    return ordenDireccion === 'asc' ? cmp : -cmp;
  });

  return (
    <PapeleraCliente sedes={sedesOrdenadas} orden={{ columna: ordenColumna, direccion: ordenDireccion }} apiToken={session.apiToken} />
  );
}
