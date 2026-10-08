import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { obtenerCartelera } from './api-eventos';
import { TarjetaEvento } from './tarjeta-evento';

/**
 * spec 011, T046 (FR-001) — los próximos tres Eventos para el Inicio público,
 * con estado vacío. Si la API falla, no rompe el Inicio: no muestra la sección.
 */
export async function ProximosEventos() {
  const t = await getTranslations('eventos.publico');
  let eventos;
  try {
    eventos = (await obtenerCartelera(0, 3)).items;
  } catch {
    return null;
  }
  const ahora = new Date();
  return (
    <section aria-labelledby="titulo-proximos-eventos" className="flex flex-col gap-4">
      <h2 id="titulo-proximos-eventos" className="text-2xl font-semibold">
        {t('proximosTitulo')}
      </h2>
      {eventos.length === 0 ? (
        <p className="text-base text-muted-foreground">{t('proximosVacio')}</p>
      ) : (
        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {eventos.map((e) => (
            <li key={e.id}>
              <TarjetaEvento evento={e} ahora={ahora} nivelTitulo="h3" />
            </li>
          ))}
        </ul>
      )}
      <Link href="/eventos" className="w-fit text-base font-medium underline underline-offset-4 hover:no-underline">
        {t('proximosVerTodos')}
      </Link>
    </section>
  );
}
