import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { apiFetch, formatearDiaEnArgentina, PERFIL_ITEMS_POR_SECCION, type Pagina, type SolicitudBandeja } from '@vida-sobrenatural/shared-types';
import { RUTA_DETALLE_SOLICITUD } from '../../../config/solicitudes';
import { EstadoBandeja, TipoTexto } from '../../solicitudes/estado-solicitud-texto';

/**
 * spec 013 (T033, FR-013a): el historial de Solicitudes de TODOS los tipos
 * conectados — la bandeja con `persona=`, la más reciente primero, hasta 20 y
 * "Ver todas en la bandeja". Cada una enlaza a su detalle.
 */
export async function SeccionSolicitudes({ personaId, apiToken }: { personaId: string; apiToken: string }) {
  const t = await getTranslations('perfil.solicitudes');
  const locale = await getLocale();
  const params = new URLSearchParams({ persona: personaId, filtro: 'todas', orden: 'fecha', dir: 'desc', take: String(PERFIL_ITEMS_POR_SECCION) });
  const pagina = await apiFetch<Pagina<SolicitudBandeja>>(`/solicitudes?${params}`, { headers: { Authorization: `Bearer ${apiToken}` }, cache: 'no-store' });

  if (pagina.items.length === 0) return <p className="text-muted-foreground">{t('vacio')}</p>;
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
        {pagina.items.map((s) => (
          <li key={`${s.tipo}:${s.id}`} className="flex flex-col gap-1 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <span className="flex flex-col gap-1">
              <Link href={RUTA_DETALLE_SOLICITUD[s.tipo](s.id)} className="font-medium underline underline-offset-2">
                <TipoTexto tipo={s.tipo} />
              </Link>
              <span className="text-sm text-muted-foreground">{t('pedidaEl', { fecha: formatearDiaEnArgentina(s.createdAt, locale) })}</span>
            </span>
            <EstadoBandeja solicitud={s} />
          </li>
        ))}
      </ul>
      {pagina.total > pagina.items.length && <p className="text-sm text-muted-foreground">{t('mostrando', { mostradas: pagina.items.length, total: pagina.total })}</p>}
      <Link href={`/solicitudes?persona=${personaId}&filtro=todas`} className="self-start font-medium underline underline-offset-2">
        {t('verTodas')}
      </Link>
    </div>
  );
}
