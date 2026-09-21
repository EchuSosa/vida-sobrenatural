import { auth } from '../../auth';
import { apiFetch, type PalabraProfetica, type Pagina } from '@vida-sobrenatural/shared-types';
import { PalabraProfeticaCliente } from './palabra-profetica-cliente';
import { BotonIngresarGoogle } from '../../components/boton-ingresar-google';

/**
 * Historia 3 (specs/003-contenido-institucional, D64): Server Component —
 * GET /palabra-profetica (historial completo, paginado) pasa al servidor.
 * Admin edita, Pastor lee (FR-028/FR-029) — la distinción vive en el
 * cliente (`esAdmin`), el guard real está en la API.
 */
export default async function PalabraProfeticaPage() {
  const session = await auth();
  if (!session) {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-16">
        <h1 className="text-2xl font-semibold">Palabra Profética</h1>
        <BotonIngresarGoogle />
      </div>
    );
  }

  // FR-030: cualquier rol que no sea Admin ni Pastor queda afuera, tanto
  // del menú (config/nav.ts) como del acceso directo por URL — el GET no
  // tiene guard en la API (igual que Sedes), así que la barrera es acá.
  const rol = session.user.rol;
  if (!rol.includes('admin') && !rol.includes('pastor')) {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold">Palabra Profética</h1>
        <p className="text-muted-foreground">Necesitás el rol Admin o Pastor para ver esta sección.</p>
      </div>
    );
  }

  const pagina = await apiFetch<Pagina<PalabraProfetica>>('/palabra-profetica?take=100', {
    headers: { Authorization: `Bearer ${session.apiToken}` },
  });

  const esAdmin = rol.includes('admin');

  return <PalabraProfeticaCliente historial={pagina.items} apiToken={session.apiToken} esAdmin={esAdmin} />;
}
