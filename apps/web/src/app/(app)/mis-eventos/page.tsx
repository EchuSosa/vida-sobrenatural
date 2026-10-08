import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { apiFetch, type MiInscripcionEvento, type Pagina } from '@vida-sobrenatural/shared-types';
import { ButtonLink, EstadoVacio } from '@vida-sobrenatural/ui';
import { auth } from '../../../auth';
import { obtenerCartelera } from '../../../components/eventos/api-eventos';
import { TarjetaEvento } from '../../../components/eventos/tarjeta-evento';
import { MisInscripciones } from './mis-inscripciones';

/**
 * spec 011, T058 (FR-022 a FR-024; ajustes-ux #48) — Mis eventos: las
 * inscripciones propias con su estado, qué sigue y sus acciones (subir el
 * comprobante, cancelar), y debajo la cartelera de próximos. `?ver=pasadas`
 * muestra las pasadas; `?pagar={id}` abre el comprobante de esa inscripción.
 * Cargando → loading.tsx; error → error.tsx. El layout de (app) ya exige
 * una Persona activa.
 */
export default async function MisEventosPage({ searchParams }: { searchParams: Promise<{ ver?: string; pagar?: string }> }) {
  const session = (await auth())!;
  const { ver, pagar } = await searchParams;
  const pasadas = ver === 'pasadas';
  const [t, mias, cartelera] = await Promise.all([
    getTranslations('misEventos'),
    apiFetch<Pagina<MiInscripcionEvento>>(`/mis-inscripciones-evento?cuando=${pasadas ? 'pasadas' : 'proximas'}&take=50`, {
      headers: { Authorization: `Bearer ${session.apiToken}` },
    }),
    pasadas ? Promise.resolve(null) : obtenerCartelera(0, 6),
  ]);
  const ahora = new Date();
  const anotados = new Set(mias.items.map((i) => i.evento.id));

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10 px-4 py-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">{t('titulo')}</h1>
        <p className="text-lg">{t('intro')}</p>
      </div>

      <section aria-labelledby="titulo-mis-inscripciones" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="titulo-mis-inscripciones" className="text-2xl font-semibold">
            {pasadas ? t('pasadasTitulo') : t('misInscripciones')}
          </h2>
          <Link href={pasadas ? '/mis-eventos' : '/mis-eventos?ver=pasadas'} className="text-base font-medium underline underline-offset-4 hover:no-underline">
            {pasadas ? t('proximasLink') : t('pasadas')}
          </Link>
        </div>
        {mias.items.length === 0 ? (
          <EstadoVacio
            mensaje={pasadas ? t('sinPasadas') : t('sinInscripciones')}
            accion={
              <ButtonLink size="xl" className="text-base" render={<Link href="/eventos" />}>
                {t('verEventos')}
              </ButtonLink>
            }
          />
        ) : (
          <MisInscripciones inscripciones={mias.items} apiToken={session.apiToken} pagar={pagar ?? null} />
        )}
      </section>

      {cartelera && (
        <section aria-labelledby="titulo-proximos" className="flex flex-col gap-4">
          <h2 id="titulo-proximos" className="text-2xl font-semibold">
            {t('proximosEventos')}
          </h2>
          {cartelera.items.filter((e) => !anotados.has(e.id)).length === 0 ? (
            <p className="text-base text-muted-foreground">{t('sinProximos')}</p>
          ) : (
            <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {cartelera.items
                .filter((e) => !anotados.has(e.id))
                .map((e) => (
                  <li key={e.id}>
                    <TarjetaEvento evento={e} ahora={ahora} nivelTitulo="h3" />
                  </li>
                ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
