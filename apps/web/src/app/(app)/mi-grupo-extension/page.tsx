import { getLocale, getTranslations } from 'next-intl/server';
import { CalendarClock, Clock, Mail, MapPin, Phone, UsersRound } from 'lucide-react';
import { apiFetch, formatearDiaEnArgentina, type GrupoLiderado } from '@vida-sobrenatural/shared-types';
import { EstadoVacio, textoHorario } from '@vida-sobrenatural/ui';
import { auth } from '../../../auth';
import { SelectorMiCamino } from '../mi-camino/selector-mi-camino';
import { AccionesPedidoGex, EnlaceWhatsappPedido } from './acciones-pedido';

const ENLACE = 'flex min-h-11 w-fit items-center gap-2 font-medium text-primary underline underline-offset-2 break-all';

/**
 * spec 014 (D225): "Mi grupo" del líder de un Grupo de Extensión, en la web app
 * (como el Discipulador, D142), pensada a 360 px. La API decide qué Grupos
 * lidera mirando la base (no el rol del JWT, que puede estar viejo): sin
 * Grupos, el vacío lo explica. Cargando y error: `loading.tsx` y `error.tsx`.
 */
export default async function MiGrupoExtensionPage() {
  const session = await auth();
  const [t, tg, locale] = await Promise.all([getTranslations('miGrupoExtension'), getTranslations('grupoExtension'), getLocale()]);
  const grupos = await apiFetch<GrupoLiderado[]>('/grupos-extension/liderados', {
    headers: { Authorization: `Bearer ${session?.apiToken ?? ''}` },
    cache: 'no-store',
  });
  const fecha = (iso: string) => formatearDiaEnArgentina(iso, locale);
  const yo = session?.user.givenName ?? session?.user.name ?? '';

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
      <SelectorMiCamino actual="/mi-grupo-extension" />
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">{t('titulo')}</h1>
        <p className="text-base text-muted-foreground">{t('intro')}</p>
      </div>
      {grupos.length === 0 && <EstadoVacio mensaje={t('vacio')} />}
      {grupos.map((g) => (
        <section key={g.id} aria-labelledby={`gex-${g.id}`} className="flex flex-col gap-5 rounded-lg border border-border p-5 text-base">
          <div className="flex flex-col gap-2">
            <h2 id={`gex-${g.id}`} className="text-xl font-semibold break-words">
              {g.nombre}
            </h2>
            <p className="flex gap-2 text-muted-foreground">
              <CalendarClock aria-hidden className="mt-0.5 size-4 shrink-0" />
              {textoHorario(g.dias, g.horaInicio, tg)}
            </p>
            <p className="flex gap-2 text-muted-foreground break-words">
              <MapPin aria-hidden className="mt-0.5 size-4 shrink-0" />
              {t('lugar', { direccion: g.direccion })}
            </p>
            <p className="flex gap-2 text-muted-foreground">
              <UsersRound aria-hidden className="mt-0.5 size-4 shrink-0" />
              {g.cupo === null ? t('sinCupo', { integrantes: g.integrantes.length }) : t('cupo', { integrantes: g.integrantes.length, cupo: g.cupo })}
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="text-lg font-semibold">{t('pedidosTitulo')}</h3>
            {g.pendientes.length === 0 ? (
              <p className="text-muted-foreground">{t('pedidosVacio')}</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {g.pendientes.map((p) => {
                  const nombre = `${p.persona.nombre} ${p.persona.apellido}`;
                  return (
                    <li key={p.id} className="flex flex-col gap-2 rounded-md border border-border p-3">
                      <span className="font-medium break-words">
                        {nombre} · {t('edad', { edad: p.persona.edad })}
                      </span>
                      <span className="flex gap-2 text-muted-foreground">
                        <Clock aria-hidden className="mt-0.5 size-4 shrink-0" />
                        {t('esperaDesde', { fecha: fecha(p.desde) })}
                      </span>
                      {p.persona.telefono ? (
                        <a href={`tel:${p.persona.telefono}`} className={ENLACE}>
                          <Phone aria-hidden className="size-4 shrink-0" />
                          {t('llamar', { nombre: p.persona.nombre })}: {p.persona.telefono}
                        </a>
                      ) : (
                        <span className="text-muted-foreground">{t('sinTelefono')}</span>
                      )}
                      {p.persona.email && (
                        <a href={`mailto:${p.persona.email}`} className={ENLACE}>
                          <Mail aria-hidden className="size-4 shrink-0" />
                          {p.persona.email}
                        </a>
                      )}
                      {p.persona.whatsapp && (
                        <EnlaceWhatsappPedido
                          whatsapp={p.persona.whatsapp}
                          nombre={p.persona.nombre}
                          texto={t('saludoWhatsapp', { nombre: p.persona.nombre, yo, grupo: g.nombre })}
                        />
                      )}
                      <AccionesPedidoGex solicitudId={p.id} nombre={nombre} />
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <h3 className="text-lg font-semibold">{t('integrantesTitulo')}</h3>
            {g.integrantes.length === 0 ? (
              <p className="text-muted-foreground">{t('integrantesVacio')}</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {g.integrantes.map((i) => (
                  <li key={i.solicitudId} className="flex flex-col gap-1 rounded-md border border-border p-3">
                    <span className="font-medium break-words">
                      {i.persona.nombre} {i.persona.apellido}
                    </span>
                    <span className="text-muted-foreground">{t('desde', { fecha: fecha(i.desde) })}</span>
                    {i.persona.telefono && (
                      <a href={`tel:${i.persona.telefono}`} className={ENLACE}>
                        <Phone aria-hidden className="size-4 shrink-0" />
                        {t('llamar', { nombre: i.persona.nombre })}: {i.persona.telefono}
                      </a>
                    )}
                    {i.persona.whatsapp && (
                      <EnlaceWhatsappPedido whatsapp={i.persona.whatsapp} nombre={i.persona.nombre} texto={`${i.persona.nombre}`} />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
