import { auth } from '../../auth';
import { apiFetch, type Libro, type Pagina } from '@vida-sobrenatural/shared-types';
import { LibrosCliente } from './libros-cliente';
import { BotonIngresarGoogle } from '../../components/boton-ingresar-google';

type Filtro = 'activas' | 'todas';

/**
 * Historia 4 (specs/003-contenido-institucional, FR-018): mismo patrón que
 * sedes/page.tsx — Server Component, filtro activas/todas por query param.
 * FR-030: cualquier rol que no sea Admin ni Pastor queda afuera, tanto del
 * menú como del acceso directo por URL.
 */
export default async function LibrosPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const session = await auth();
  if (!session) {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-16">
        <h1 className="text-2xl font-semibold">Libros</h1>
        <BotonIngresarGoogle />
      </div>
    );
  }

  const rol = session.user.rol;
  if (!rol.includes('admin') && !rol.includes('pastor')) {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold">Libros</h1>
        <p className="text-muted-foreground">Necesitás el rol Admin o Pastor para ver esta sección.</p>
      </div>
    );
  }

  const { estado } = await searchParams;
  const filtro: Filtro = estado === 'todas' ? 'todas' : 'activas';

  const pagina = await apiFetch<Pagina<Libro>>(`/libros?estado=${filtro}&take=200`, {
    headers: { Authorization: `Bearer ${session.apiToken}` },
  });

  return <LibrosCliente libros={pagina.items} filtro={filtro} apiToken={session.apiToken} esAdmin={rol.includes('admin')} />;
}
