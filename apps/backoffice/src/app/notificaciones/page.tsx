import { redirect } from 'next/navigation';
import { apiFetch, type MailFallido, type NotificacionManualResumen, type Pagina } from '@vida-sobrenatural/shared-types';
import { requerirPermiso, tienePermisoSesion } from '../../auth';
import { NotificacionesCliente } from './notificaciones-cliente';

/**
 * spec 012, T048 (FR-026, FR-031, FR-032) — Notificaciones del backoffice: los
 * avisos manuales enviados (de a 20, página en la URL) y, debajo, los mails de
 * avisos automáticos que no salieron. `notificaciones.ver` para entrar (Admin
 * y Pastor); "Enviar un aviso" solo con `notificaciones.enviar`. Cargando →
 * loading.tsx; error → error.tsx.
 */
export const dynamic = 'force-dynamic';

export default async function NotificacionesPage({ searchParams }: { searchParams: Promise<{ pagina?: string; fallidos?: string }> }) {
  const session = await requerirPermiso('notificaciones.ver');
  const params = await searchParams;
  const headers = { Authorization: `Bearer ${session.apiToken}` };
  const [avisos, fallidos] = await Promise.all([
    apiFetch<Pagina<NotificacionManualResumen> & { pagina: number }>(`/notificaciones?pagina=${Number(params.pagina) || 1}`, { headers, cache: 'no-store' }),
    apiFetch<Pagina<MailFallido> & { pagina: number }>(`/notificaciones/mails-fallidos?pagina=${Number(params.fallidos) || 1}`, { headers, cache: 'no-store' }),
  ]);
  // docs/15 §Listados paginados, punto 5: la URL dice la página que se ve.
  if ((params.pagina !== undefined && String(avisos.pagina) !== params.pagina) || (params.fallidos !== undefined && String(fallidos.pagina) !== params.fallidos)) {
    const q = new URLSearchParams();
    if (avisos.pagina > 1) q.set('pagina', String(avisos.pagina));
    if (fallidos.pagina > 1) q.set('fallidos', String(fallidos.pagina));
    redirect(q.size ? `/notificaciones?${q}` : '/notificaciones');
  }
  return (
    <NotificacionesCliente
      avisos={avisos}
      fallidos={fallidos}
      puedeEnviar={tienePermisoSesion(session, 'notificaciones.enviar')}
      apiToken={session.apiToken}
    />
  );
}
