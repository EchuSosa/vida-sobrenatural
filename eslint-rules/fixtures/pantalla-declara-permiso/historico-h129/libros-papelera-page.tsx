// Fixture de pantalla-declara-permiso.test.mjs: `git show 7fbeea2:apps/backoffice/src/app/libros/papelera/page.tsx` (antes de la Historia 3, H-129). No editar.
import Link from 'next/link';
import { requerirSesion } from '../../../auth';
import { apiFetch, ApiError, type Libro, type Pagina } from '@vida-sobrenatural/shared-types';
import { PapeleraCliente } from './papelera-cliente';

type ColumnaOrden = 'titulo' | 'autor' | 'eliminadoEn';

/**
 * D119: papelera de Libros. Mismo patrón que sedes/papelera/page.tsx —
 * distingue el 403 (SIN_PERMISO) del resto: "Reintentar" no serviría de
 * nada ahí. H-88: orden en la URL, en memoria (D126) — mismo criterio que
 * el resto de los listados chicos.
 */
export default async function PapeleraLibrosPage({
  searchParams,
}: {
  searchParams: Promise<{ orden?: string; dir?: string; q?: string }>;
}) {
  const session = await requerirSesion();
  const rol = session.user.rol;
  if (!rol.includes('admin') && !rol.includes('pastor')) {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold">Papelera de Libros</h1>
        <p className="text-muted-foreground">Necesitás el rol Admin o Pastor para ver esta sección.</p>
      </div>
    );
  }

  const { orden: ordenParam, dir, q } = await searchParams;
  const ordenColumna: ColumnaOrden =
    ordenParam === 'autor' ? 'autor' : ordenParam === 'eliminadoEn' ? 'eliminadoEn' : 'titulo';
  const ordenDireccion: 'asc' | 'desc' = dir === 'desc' ? 'desc' : 'asc';
  const busqueda = (q ?? '').trim().toLocaleLowerCase('es');

  let pagina: Pagina<Libro>;
  try {
    pagina = await apiFetch<Pagina<Libro>>('/libros?estado=papelera&take=200', {
      headers: { Authorization: `Bearer ${session.apiToken}` },
    });
  } catch (e) {
    if (e instanceof ApiError && e.code === 'SIN_PERMISO') {
      return (
        <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-16 text-center">
          <h1 className="text-2xl font-semibold">Papelera de Libros</h1>
          <p className="text-muted-foreground">Necesitás el rol Admin para ver la papelera.</p>
          <Link href="/libros" className="text-sm underline underline-offset-4">
            Volver a Libros
          </Link>
        </div>
      );
    }
    throw e;
  }

  const itemsFiltrados = busqueda
    ? pagina.items.filter(
        (libro) => libro.titulo.toLocaleLowerCase('es').includes(busqueda) || libro.autor.toLocaleLowerCase('es').includes(busqueda),
      )
    : pagina.items;
  const librosOrdenados = [...itemsFiltrados].sort((a, b) => {
    const cmp =
      ordenColumna === 'eliminadoEn'
        ? (a.eliminadoEn ?? '').localeCompare(b.eliminadoEn ?? '')
        : a[ordenColumna].localeCompare(b[ordenColumna], 'es');
    return ordenDireccion === 'asc' ? cmp : -cmp;
  });

  return (
    <PapeleraCliente
      libros={librosOrdenados}
      orden={{ columna: ordenColumna, direccion: ordenDireccion }}
      apiToken={session.apiToken}
      esAdmin={rol.includes('admin')}
    />
  );
}
