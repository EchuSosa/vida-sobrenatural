import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { ArrowLeft, CalendarClock, CircleAlert, CircleMinus, Hourglass, MapPin, MessageCircle, Navigation, Phone, Undo2, UsersRound } from 'lucide-react';
import {
  apiFetch,
  enlaceComoLlegar,
  enlaceWhatsapp,
  formatearDiaEnArgentina,
  type EstadoMiGrupoExtension,
} from '@vida-sobrenatural/shared-types';
import { AvisoEstado, ButtonLink, textoHorario, textoNombres } from '@vida-sobrenatural/ui';
import { auth } from '../../../../auth';
import { BuscadorGrupos } from './buscador';
import { RetirarPedidoGex } from './retirar-pedido';

const ICONO = 'text-primary';
const ICONO_NEUTRO = 'text-muted-foreground';
const ENLACE = 'flex min-h-11 w-fit items-center gap-2 font-medium text-primary underline underline-offset-2';

/**
 * spec 014 (D223–D225): "Mi grupo de extensión" de la persona, pensada a 360 px.
 * Según `GET /grupos-extension/me`: integrante (dirección exacta, horario,
 * líderes con contacto y "Cómo llegar"), pedido en espera (con "Retirar"), o
 * "Encontrá tu grupo". Cargando y error: `loading.tsx` y `error.tsx`; el
 * vacío de la búsqueda lo resuelve el buscador.
 */
export default async function GrupoExtensionPage() {
  const session = await auth();
  const [t, tg, locale] = await Promise.all([getTranslations('grupoExtension.pagina'), getTranslations('grupoExtension'), getLocale()]);
  const estado = await apiFetch<EstadoMiGrupoExtension>('/grupos-extension/me', {
    headers: { Authorization: `Bearer ${session?.apiToken ?? ''}` },
    cache: 'no-store',
  });
  const fecha = (iso: string) => formatearDiaEnArgentina(iso, locale);
  const yo = session?.user.givenName ?? session?.user.name ?? '';

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
      <Link href="/mi-camino" className="flex min-h-11 w-fit items-center gap-2 text-base text-muted-foreground underline underline-offset-2 hover:text-foreground">
        <ArrowLeft aria-hidden className="size-4" />
        {t('volver')}
      </Link>
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">{t('titulo')}</h1>
        {estado.estado === 'sin_grupo' && <p className="text-base text-muted-foreground">{t('intro')}</p>}
      </div>

      {estado.estado === 'integrante' && (
        <section aria-labelledby="mi-grupo-titulo" className="flex flex-col gap-5 rounded-lg border border-border p-5">
          <div className="flex gap-3">
            <UsersRound aria-hidden className={`mt-1 size-5 shrink-0 ${ICONO}`} />
            <div className="flex flex-col gap-1">
              <h2 id="mi-grupo-titulo" className="text-xl font-semibold break-words">
                {tg('integrante.titulo', { grupo: estado.grupo.nombre })}
              </h2>
              <p className="text-base text-muted-foreground">{tg('integrante.desde', { fecha: fecha(estado.desde) })}</p>
            </div>
          </div>
          <dl className="flex flex-col gap-4 text-base">
            <div className="flex flex-col gap-1">
              <dt className="flex items-center gap-3 font-medium">
                <CalendarClock aria-hidden className={`size-5 shrink-0 ${ICONO_NEUTRO}`} />
                {tg('integrante.cuando')}
              </dt>
              <dd className="pl-8 text-muted-foreground">{textoHorario(estado.grupo.dias, estado.grupo.horaInicio, tg)}</dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="flex items-center gap-3 font-medium">
                <MapPin aria-hidden className={`size-5 shrink-0 ${ICONO_NEUTRO}`} />
                {tg('integrante.donde')}
              </dt>
              <dd className="pl-8 break-words text-muted-foreground">
                {estado.grupo.enLaIglesia ? tg('integrante.enLaIglesia', { sede: estado.grupo.sede ?? '' }) : estado.grupo.direccion}
              </dd>
              {estado.grupo.enLaIglesia && <dd className="pl-8 break-words text-muted-foreground">{estado.grupo.direccion}</dd>}
              {!estado.grupo.enLaIglesia && estado.grupo.zona && <dd className="pl-8 text-muted-foreground">{tg('integrante.zona', { zona: estado.grupo.zona })}</dd>}
            </div>
          </dl>
          {estado.grupo.direccion && (
            <ButtonLink
              href={enlaceComoLlegar(estado.grupo.direccion)}
              target="_blank"
              rel="noopener noreferrer"
              size="xl"
              className="w-full text-base sm:w-fit"
              aria-label={tg('integrante.comoLlegarAria', { grupo: estado.grupo.nombre })}
            >
              <Navigation aria-hidden />
              {tg('integrante.comoLlegar')}
            </ButtonLink>
          )}
          <div className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">{tg('integrante.lideres')}</h2>
            <ul className="flex flex-col gap-3">
              {estado.grupo.lideres.map((l) => (
                <li key={l.id} className="flex flex-col gap-1 rounded-md border border-border p-3 text-base">
                  <span className="font-medium break-words">
                    {l.nombre} {l.apellido}
                  </span>
                  {l.telefono && (
                    <a href={`tel:${l.telefono}`} className={ENLACE}>
                      <Phone aria-hidden className="size-4 shrink-0" />
                      {tg('integrante.llamar', { nombre: l.nombre })}
                    </a>
                  )}
                  {l.whatsapp && (
                    <a
                      href={`${enlaceWhatsapp(l.whatsapp)}?text=${encodeURIComponent(tg('integrante.saludoWhatsapp', { nombre: l.nombre, yo, grupo: estado.grupo.nombre }))}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={ENLACE}
                    >
                      <MessageCircle aria-hidden className="size-4 shrink-0" />
                      {tg('integrante.whatsapp', { nombre: l.nombre })}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {estado.estado === 'pendiente' && (
        <section className="flex flex-col gap-4 rounded-lg border border-border p-5">
          <AvisoEstado icono={<Hourglass className={ICONO} />} titulo={tg('pendiente.titulo', { grupo: estado.grupo.nombre })}>
            <span className="flex flex-col gap-1">
              <span>{tg('pendiente.texto', { lideres: textoNombres(estado.grupo.lideres, tg), fecha: fecha(estado.desde) })}</span>
              <span>{textoHorario(estado.grupo.dias, estado.grupo.horaInicio, tg)}</span>
              {estado.grupo.zona && <span>{tg('integrante.zona', { zona: estado.grupo.zona })}</span>}
            </span>
          </AvisoEstado>
          <RetirarPedidoGex solicitudId={estado.solicitudId} grupo={estado.grupo.nombre} />
        </section>
      )}

      {estado.estado === 'sin_grupo' && (
        <>
          {estado.ultima && (
            <AvisoEstado
              role="note"
              className="rounded-md border border-border p-3 text-base"
              icono={
                estado.ultima.estado === 'rechazada' ? <CircleAlert className={ICONO_NEUTRO} /> : estado.ultima.estado === 'retirada' ? <Undo2 className={ICONO_NEUTRO} /> : <CircleMinus className={ICONO_NEUTRO} />
              }
              titulo={tg(`ultima.${estado.ultima.estado}Titulo`, { grupo: estado.ultima.grupo })}
            >
              {estado.ultima.estado !== 'retirada' && (
                <span className="flex flex-col gap-1">
                  <span>{tg(`ultima.${estado.ultima.estado}Texto`)}</span>
                  {estado.ultima.mensaje && <span className="break-words">{tg('ultima.mensaje', { mensaje: estado.ultima.mensaje })}</span>}
                </span>
              )}
            </AvisoEstado>
          )}
          <BuscadorGrupos />
        </>
      )}

      {estado.lidera > 0 && (
        <ButtonLink render={<Link href="/mi-grupo-extension" />} variant="outline" size="xl" className="w-full text-base sm:w-fit">
          <UsersRound aria-hidden />
          {t('liderEnlace')}
        </ButtonLink>
      )}
    </div>
  );
}
