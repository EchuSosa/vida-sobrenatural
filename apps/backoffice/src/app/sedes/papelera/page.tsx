import Link from 'next/link';
import { auth } from '../../../auth';
import { apiFetch, ApiError, type Sede } from '@vida-sobrenatural/shared-types';
import { PapeleraCliente } from './papelera-cliente';
import { BotonIngresarGoogle } from '../../../components/boton-ingresar-google';

/**
 * D119: papelera de Sedes, para el Admin. H-60/H-43 (ronda 7): Server
 * Component — GET /sedes?estado=papelera pasa al servidor. Gateado por rol
 * en el backend (Principio V); acá se distingue el 403 (SIN_PERMISO) del
 * resto: no es un error transitorio, "Reintentar" (error.tsx) no serviría
 * de nada — se muestra el motivo directamente, sin ofrecer un botón que no
 * va a arreglar nada.
 */
export default async function PapeleraSedesPage() {
  const session = await auth();
  if (!session) {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-16">
        <h1 className="text-2xl font-semibold">Papelera de Sedes</h1>
        <BotonIngresarGoogle />
      </div>
    );
  }

  let sedes: Sede[];
  try {
    sedes = await apiFetch<Sede[]>('/sedes?estado=papelera', {
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

  return <PapeleraCliente sedes={sedes} apiToken={session.apiToken} />;
}
