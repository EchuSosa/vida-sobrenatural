import Link from 'next/link';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { EstadoVacio, Paginacion } from '@vida-sobrenatural/ui';
import { obtenerCartelera } from '../../../components/eventos/api-eventos';
import { TarjetaEvento } from '../../../components/eventos/tarjeta-evento';

const POR_PAGINA = 12;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('eventos.publico');
  return {
    title: t('metaTitulo'),
    description: t('metaDescripcion'),
    alternates: { canonical: '/eventos' },
    openGraph: { title: t('metaTitulo'), description: t('metaDescripcion'), url: '/eventos' },
  };
}

/**
 * spec 011, T045 (FR-001, FR-006) — la cartelera pública: Eventos publicados
 * de hoy en adelante, por fecha, paginada, con estado vacío amable (ajustes-ux
 * #13). Server Component con ISR (research #10); cargando → loading.tsx;
 * error → error.tsx.
 */
export default async function EventosPage({ searchParams }: { searchParams: Promise<{ pagina?: string }> }) {
  const { pagina: paginaParam } = await searchParams;
  const pagina = Math.max(1, Number(paginaParam) || 1);
  const [t, tf, cartelera] = await Promise.all([
    getTranslations('eventos.publico'),
    getTranslations('footer'),
    obtenerCartelera((pagina - 1) * POR_PAGINA, POR_PAGINA),
  ]);
  const totalPaginas = Math.max(1, Math.ceil(cartelera.total / POR_PAGINA));
  const ahora = new Date();

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-16">
      <div className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">{t('titulo')}</h1>
        <p className="text-lg leading-7">{t('intro')}</p>
      </div>
      {cartelera.items.length === 0 ? (
        <EstadoVacio
          mensaje={t('vacio')}
          accion={
            <a href={tf('instagramUrl')} target="_blank" rel="noreferrer" className="text-base font-medium underline underline-offset-4 hover:no-underline">
              {t('seguinos')}
            </a>
          }
        />
      ) : (
        <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {cartelera.items.map((evento) => (
            <li key={evento.id}>
              <TarjetaEvento evento={evento} ahora={ahora} />
            </li>
          ))}
        </ul>
      )}
      {totalPaginas > 1 && (
        <Paginacion
          paginaActual={pagina}
          totalPaginas={totalPaginas}
          renderEnlace={(p) => <Link href={p <= 1 ? '/eventos' : `/eventos?pagina=${p}`} />}
          etiquetaNav={t('paginado')}
          etiquetaAnterior={t('anterior')}
          etiquetaSiguiente={t('siguiente')}
        />
      )}
    </div>
  );
}
