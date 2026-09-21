import { auth } from '../../auth';
import { apiFetch, type Sede } from '@vida-sobrenatural/shared-types';
import { SedesCliente } from './sedes-cliente';
import { BotonIngresarGoogle } from '../../components/boton-ingresar-google';

type Filtro = 'activas' | 'todas';
type ColumnaOrden = 'nombre' | 'direccion';

/**
 * H-60/H-43 (revisión manual ronda 7): Server Component — el fetch de
 * GET /sedes pasa al servidor (loading.tsx/error.tsx dan cargando/error, ya
 * no hay que armarlos a mano). De cliente queda solo lo interactivo
 * (SedesCliente: el modal de alta, el orden/filtro que navegan, y las
 * acciones de cada fila) — Principio VIII, H-69.
 */
export default async function SedesPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; orden?: string; dir?: string }>;
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

  const { estado, orden: ordenParam, dir } = await searchParams;
  const filtro: Filtro = estado === 'todas' ? 'todas' : 'activas';
  const ordenColumna: ColumnaOrden = ordenParam === 'direccion' ? 'direccion' : 'nombre';
  const ordenDireccion: 'asc' | 'desc' = dir === 'desc' ? 'desc' : 'asc';

  const sedes = await apiFetch<Sede[]>(`/sedes?estado=${filtro}`);
  const sedesOrdenadas = [...sedes].sort((a, b) => {
    const cmp = String(a[ordenColumna]).localeCompare(String(b[ordenColumna]), 'es');
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
