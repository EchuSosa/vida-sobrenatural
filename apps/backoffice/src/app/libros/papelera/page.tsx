import Link from 'next/link';
import { auth } from '../../../auth';
import { apiFetch, ApiError, type Libro, type Pagina } from '@vida-sobrenatural/shared-types';
import { PapeleraCliente } from './papelera-cliente';
import { BotonIngresarGoogle } from '../../../components/boton-ingresar-google';

/**
 * D119: papelera de Libros. Mismo patrón que sedes/papelera/page.tsx —
 * distingue el 403 (SIN_PERMISO) del resto: "Reintentar" no serviría de
 * nada ahí.
 */
export default async function PapeleraLibrosPage() {
  const session = await auth();
  if (!session) {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-16">
        <h1 className="text-2xl font-semibold">Papelera de Libros</h1>
        <BotonIngresarGoogle />
      </div>
    );
  }

  const rol = session.user.rol;
  if (!rol.includes('admin') && !rol.includes('pastor')) {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold">Papelera de Libros</h1>
        <p className="text-muted-foreground">Necesitás el rol Admin o Pastor para ver esta sección.</p>
      </div>
    );
  }

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

  return <PapeleraCliente libros={pagina.items} apiToken={session.apiToken} esAdmin={rol.includes('admin')} />;
}
