import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { useTranslations } from 'next-intl';
import type { Libro } from '@vida-sobrenatural/shared-types';
import { MigaDePan, PlaceholderImagen } from '@vida-sobrenatural/ui';

export const metadata = {
  title: 'Ediciones VS — Vida Sobrenatural',
  description: 'Los libros publicados por Ediciones VS, la editorial de Vida Sobrenatural.',
};

/** FR-007/FR-008 — solo libros activos, ya ordenados por `orden` (default de GET /libros). */
async function getLibrosActivos(): Promise<Libro[]> {
  const baseUrl = process.env.API_BASE_URL ?? 'http://localhost:3333';
  const response = await fetch(`${baseUrl}/libros?take=100`, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`GET /libros respondió ${response.status}`);
  }
  const pagina: { items: Libro[]; total: number } = await response.json();
  return pagina.items;
}

function LibroCard({ libro, t }: { libro: Libro; t: ReturnType<typeof useTranslations> }) {
  return (
    <li className="flex flex-col gap-2">
      {libro.portadaUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- portada servida por apps/api (D110), sin loader de next/image configurado para ese host todavía
        <img
          src={libro.portadaUrl}
          alt={libro.portadaDescripcion ?? t('portadaAlt', { titulo: libro.titulo })}
          className="aspect-[2/3] w-full rounded-md object-cover"
        />
      ) : (
        <PlaceholderImagen aspecto="portada" etiqueta={t('portadaAlt', { titulo: libro.titulo })} />
      )}
      {/* H-84: altura mínima reservada para dos líneas — con títulos tan
          desparejos, sin esto las tarjetas de una fila quedan de alturas
          visiblemente distintas. */}
      <p className="min-h-[3em] font-medium">{libro.titulo}</p>
      <p className="text-sm text-muted-foreground">
        {t('autorPor', { autor: libro.autor })} · {libro.anio}
      </p>
    </li>
  );
}

export default async function EdicionesVsPage() {
  const [libros, t, tn] = await Promise.all([
    getLibrosActivos(),
    getTranslations('edicionesVs'),
    getTranslations('nosotros'),
  ]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-16">
      <MigaDePan tramos={[{ label: tn('titulo'), href: '/nosotros' }, { label: t('titulo') }]} LinkComponente={Link} />

      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">{t('titulo')}</h1>
        <p className="text-lg leading-7 text-foreground">{t('introTexto')}</p>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-xl font-medium">{t('comoConseguirTitulo')}</h2>
        <p className="text-foreground">{t('comoConseguirTexto')}</p>
        {/* Enlaces propios de Ediciones VS, distintos de los de la iglesia en el pie general. */}
        <nav aria-label={`${t('facebookLabel')}, ${t('instagramLabel')}`} className="flex gap-4 text-sm">
          <a
            href="https://www.facebook.com/ediciones.vs.lp"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline underline-offset-4"
          >
            {t('facebookLabel')}
          </a>
          <a
            href="https://instagram.com/edicionesvs"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline underline-offset-4"
          >
            {t('instagramLabel')}
          </a>
        </nav>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-medium">{t('catalogoTitulo')}</h2>

        {libros.length === 0 && (
          // FR-008: estado vacío amable, no una sección en blanco ni un error.
          <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border p-6 text-center">
            <p className="font-medium">{t('vacioTitulo')}</p>
            <p className="text-muted-foreground">{t('vacioTexto')}</p>
          </div>
        )}

        {libros.length > 0 && (
          <ul aria-label={t('catalogoTitulo')} className="grid grid-cols-2 items-stretch gap-6 sm:grid-cols-3">
            {libros.map((libro) => (
              <LibroCard key={libro.id} libro={libro} t={t} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
