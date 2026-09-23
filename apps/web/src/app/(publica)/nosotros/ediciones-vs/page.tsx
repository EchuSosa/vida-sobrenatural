import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { useTranslations } from 'next-intl';
import { PORTADA_ASPECTO, type Libro } from '@vida-sobrenatural/shared-types';
import { MigaDePan, PlaceholderImagen } from '@vida-sobrenatural/ui';
import { IconoFacebook, IconoInstagram } from '../../../../components/iconos-redes';

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
    // H-102: subgrid, no una altura mínima a ojo — la tarjeta declara sus
    // propias 3 filas (imagen, título, datos) pero deja que la GRILLA DE LA
    // PÁGINA las mida (`grid-rows-subgrid` + `row-span-3`); el alto de cada
    // fila pasa a ser el del contenido más alto de esa fila, en toda la
    // grilla — no un número fijo que reserva siempre el peor caso. En una
    // sola columna (celular) cada tarjeta es su propia fila, así que esto
    // no cambia nada ahí — se resuelve solo, sin media query.
    <li className="grid grid-rows-subgrid gap-2 row-span-3">
      {libro.portadaUrl ? (
        // H-84/D125: caja de proporción fija (PORTADA_ASPECTO, hoy 1:1 —
        // temporal) con la imagen centrada por `object-contain`, sobre el
        // mismo fondo que el placeholder (`bg-secondary`) — para que el
        // aire alrededor de una foto que no llena la caja se lea como
        // diseñado, no como una imagen rota, y la grilla quede pareja
        // (H-84) sea cual sea la proporción real de cada foto.
        <div
          className="flex w-full items-center justify-center overflow-hidden rounded-md bg-secondary"
          style={{ aspectRatio: `${PORTADA_ASPECTO.ancho} / ${PORTADA_ASPECTO.alto}` }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- portada servida por apps/api (D110), sin loader de next/image configurado para ese host todavía */}
          <img
            src={libro.portadaUrl}
            alt={libro.portadaDescripcion ?? t('portadaAlt', { titulo: libro.titulo })}
            className="h-full w-full object-contain"
          />
        </div>
      ) : (
        <PlaceholderImagen aspecto="portada" etiqueta={t('portadaAlt', { titulo: libro.titulo })} />
      )}
      <p className="font-medium">{libro.titulo}</p>
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
        {/* Enlaces propios de Ediciones VS, distintos de los de la iglesia en
            el pie general (footer-publico.tsx) — mismo patrón visual (H-83):
            solo ícono con aria-label, no texto. */}
        <nav aria-label={`${t('facebookLabel')}, ${t('instagramLabel')}`} className="flex gap-x-4">
          <a
            href={t('facebookUrl')}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t('facebookLabel')}
            className="hover:text-foreground"
          >
            <IconoFacebook className="size-5" />
          </a>
          <a
            href={t('instagramUrl')}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t('instagramLabel')}
            className="hover:text-foreground"
          >
            <IconoInstagram className="size-5" />
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
