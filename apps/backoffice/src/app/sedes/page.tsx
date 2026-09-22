import { auth } from '../../auth';
import { apiFetch, type Sede } from '@vida-sobrenatural/shared-types';
import { SedesCliente } from './sedes-cliente';
import { BotonIngresarGoogle } from '../../components/boton-ingresar-google';

type Filtro = 'activas' | 'todas';
type ColumnaOrden = 'nombre' | 'direccion' | 'estado';

/**
 * H-60/H-43 (revisión manual ronda 7): Server Component — el fetch de
 * GET /sedes pasa al servidor (loading.tsx/error.tsx dan cargando/error, ya
 * no hay que armarlos a mano). De cliente queda solo lo interactivo
 * (SedesCliente: el modal de alta, el orden/filtro/búsqueda que navegan, y
 * las acciones de cada fila) — Principio VIII, H-69.
 *
 * H-88 (D126): búsqueda (`q`, por nombre) en memoria, acá — mismo criterio
 * que el filtro y el orden, y con pocos registros (hoy) filtrar en
 * servidor o cliente da lo mismo en resultado; se hace acá para que
 * SedesCliente reciba `sedes` ya lista, sin lógica de filtrado propia.
 */
export default async function SedesPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; orden?: string; dir?: string; q?: string }>;
}) {
  const session = await auth();
  if (!session) {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-16">
        <h1 className="text-2xl font-semibold">Sedes</h1>
        <BotonIngresarGoogle />
      </div>
    );
  }

  const { estado, orden: ordenParam, dir, q } = await searchParams;
  const filtro: Filtro = estado === 'todas' ? 'todas' : 'activas';
  const ordenColumna: ColumnaOrden =
    ordenParam === 'direccion' ? 'direccion' : ordenParam === 'estado' ? 'estado' : 'nombre';
  const ordenDireccion: 'asc' | 'desc' = dir === 'desc' ? 'desc' : 'asc';
  const busqueda = (q ?? '').trim().toLocaleLowerCase('es');

  const sedes = await apiFetch<Sede[]>(`/sedes?estado=${filtro}`);
  const sedesFiltradas = busqueda ? sedes.filter((sede) => sede.nombre.toLocaleLowerCase('es').includes(busqueda)) : sedes;
  const sedesOrdenadas = [...sedesFiltradas].sort((a, b) => {
    const cmp = ordenColumna === 'estado' ? Number(a.activo) - Number(b.activo) : String(a[ordenColumna]).localeCompare(String(b[ordenColumna]), 'es');
    return ordenDireccion === 'asc' ? cmp : -cmp;
  });

  return (
    <SedesCliente
      sedes={sedesOrdenadas}
      filtro={filtro}
      orden={{ columna: ordenColumna, direccion: ordenDireccion }}
      apiToken={session.apiToken}
    />
  );
}
