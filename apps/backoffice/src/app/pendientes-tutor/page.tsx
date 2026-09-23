import { requerirSesion } from '../../auth';
import { apiFetch, type Pagina, type PersonaPendienteTutor } from '@vida-sobrenatural/shared-types';
import { PendientesTutorCliente } from './pendientes-tutor-cliente';
import { TAMANIO_PAGINA } from './constantes';

/**
 * H-29 (revisión manual, actualización 2026-09-20, D94/D102/D108): activar
 * y cerrar el caso (H-70) pasan del alert/prompt/confirm nativo del
 * navegador al sistema de diseño. H-60/H-43 (ronda 7): Server Component —
 * el primer GET /personas/pendientes-tutor pasa al servidor. "Cargar más"
 * (H-42) es la excepción real que sigue en cliente (punto 5): es
 * paginación incremental sobre una lista que ya se está mostrando, no un
 * fetch inicial — no hay Server Action de "traer una página más" sin
 * volver a montar toda la ruta, así que PendientesTutorCliente la pide con
 * `apiFetch` directo, como antes.
 *
 * H-88 (D126): `q` filtra en la API (`buscar`), no en memoria — esta cola
 * pagina de verdad (a diferencia de Sedes/Libros/Palabra Profética), así
 * que la pantalla solo ve una página a la vez y filtrar acá no alcanzaría.
 * Cuando `q` cambia, esta página se vuelve a renderizar con una
 * `paginaInicial` nueva — PendientesTutorCliente ya sincronizaba su estado
 * con esa prop (para router.refresh() tras Activar/Cerrar el caso), así
 * que el mismo mecanismo reinicia la lista filtrada sin código nuevo ahí.
 */
export default async function PendientesTutorPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await requerirSesion();
  const { q } = await searchParams;
  const buscar = (q ?? '').trim();

  const pagina = await apiFetch<Pagina<PersonaPendienteTutor>>(
    `/personas/pendientes-tutor?skip=0&take=${TAMANIO_PAGINA}${buscar ? `&buscar=${encodeURIComponent(buscar)}` : ''}`,
    { headers: { Authorization: `Bearer ${session.apiToken}` } },
  );

  return <PendientesTutorCliente paginaInicial={pagina} apiToken={session.apiToken} />;
}
