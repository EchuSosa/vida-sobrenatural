import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { CircleDot, Megaphone } from 'lucide-react';
import { apiFetch, AVISOS_POR_PAGINA, type AvisoResumen, type Pagina } from '@vida-sobrenatural/shared-types';
import { ButtonLink, EstadoVacio } from '@vida-sobrenatural/ui';
import { auth } from '../../../auth';
import { MarcarTodosLeidos } from './marcar-todos';
import { PaginacionAvisos } from './paginacion-avisos';
import { claveTexto, fechaCompleta, fechaRelativa, paramsParaTexto } from './textos-aviso';

/**
 * spec 012, T023 (FR-001, FR-002, FR-004, FR-006, FR-009; ajustes-ux #48) —
 * la pestaña Avisos. Cada tarjeta es un enlace real a `/avisos/{id}/ir`, que
 * marca leído y lleva al destino en un solo toque, sin JS (research #9).
 * Cargando → loading.tsx; error → error.tsx. Diseñada a 360 px, 16 px y 44 px (D150).
 */
export const dynamic = 'force-dynamic';

export default async function AvisosPage({ searchParams }: { searchParams: Promise<{ pagina?: string }> }) {
  const session = (await auth())!;
  const { pagina: paginaParam } = await searchParams;
  const pedida = Number(paginaParam) || 1;
  const autorizacion = { Authorization: `Bearer ${session.apiToken}` };
  const [t, locale, avisos, sinLeer] = await Promise.all([
    getTranslations('avisos'),
    getLocale(),
    apiFetch<Pagina<AvisoResumen> & { pagina: number }>(`/avisos?pagina=${pedida}`, {
      headers: autorizacion,
      cache: 'no-store',
    }),
    apiFetch<{ cantidad: number }>('/avisos/sin-leer', { headers: autorizacion, cache: 'no-store' }),
  ]);
  // docs/15 §Listados paginados, punto 5: la URL dice la página que se ve.
  if (paginaParam !== undefined && String(avisos.pagina) !== paginaParam) {
    redirect(avisos.pagina === 1 ? '/avisos' : `/avisos?pagina=${avisos.pagina}`);
  }
  const totalPaginas = Math.max(1, Math.ceil(avisos.total / AVISOS_POR_PAGINA));
  const ahora = new Date();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">{t('titulo')}</h1>
        <p className="text-base text-muted-foreground">{t('intro')}</p>
      </div>

      {avisos.total === 0 ? (
        <EstadoVacio
          mensaje={t('vacio')}
          accion={
            <ButtonLink size="xl" className="text-base" render={<Link href="/mi-camino" />}>
              {t('irAMiCamino')}
            </ButtonLink>
          }
        />
      ) : (
        <>
          {sinLeer.cantidad > 0 && <MarcarTodosLeidos apiToken={session.apiToken} />}
          <ul className="flex flex-col gap-3">
            {avisos.items.map((aviso) => {
              const manual = aviso.tipo === 'manual';
              const textoDe = (parte: 'titulo' | 'detalle') =>
                aviso.evento && t.has(claveTexto(aviso.evento, parte)) ? t(claveTexto(aviso.evento, parte), paramsParaTexto(aviso.params, locale)) : null;
              const titulo = manual ? aviso.titulo : (textoDe('titulo') ?? t('deLaIglesia'));
              const detalle = manual ? aviso.extracto : textoDe('detalle');
              return (
                <li key={aviso.id}>
                  <a
                    href={`/avisos/${aviso.id}/ir`}
                    className={`flex min-h-11 gap-3 rounded-lg border p-4 hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${aviso.leido ? 'border-border bg-card' : 'border-primary bg-card'}`}
                  >
                    {manual ? (
                      <Megaphone aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                    ) : (
                      <span aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
                    )}
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      {!aviso.leido && (
                        <span className="inline-flex items-center gap-1 text-base font-semibold text-foreground">
                          <CircleDot aria-hidden="true" className="size-4" />
                          {t('sinLeer')}
                        </span>
                      )}
                      <span className={`text-base ${aviso.leido ? 'font-medium' : 'font-semibold'}`}>{titulo}</span>
                      {detalle && <span className="text-base text-muted-foreground">{detalle}</span>}
                      <time dateTime={aviso.fecha} title={fechaCompleta(aviso.fecha, locale)} className="text-sm text-muted-foreground">
                        {fechaRelativa(aviso.fecha, ahora, locale)}
                        <span className="sr-only">{t('recibido', { fecha: fechaCompleta(aviso.fecha, locale) })}</span>
                      </time>
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
          <PaginacionAvisos paginaActual={avisos.pagina} totalPaginas={totalPaginas} etiquetas={{ nav: t('paginado'), anterior: t('anterior'), siguiente: t('siguiente') }} />
        </>
      )}
    </div>
  );
}
