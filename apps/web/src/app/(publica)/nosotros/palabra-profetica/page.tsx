import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { PalabraProfetica } from '@vida-sobrenatural/shared-types';
import { MarkdownSeguro, MigaDePan } from '@vida-sobrenatural/ui';
import { VideoYoutube } from '../../../../components/video-youtube';

export const metadata = {
  title: 'Palabra Profética — Vida Sobrenatural',
  description: 'La Palabra Profética del año de Vida Sobrenatural.',
};

/**
 * FR-004/FR-006. `null` cuando la API responde 204 (ninguna vigente
 * todavía) — la página renderiza su propio estado vacío, no un error.
 */
async function getPalabraProfeticaVigente(): Promise<PalabraProfetica | null> {
  const baseUrl = process.env.API_BASE_URL ?? 'http://localhost:3333';
  const response = await fetch(`${baseUrl}/palabra-profetica?vigente=true`, { cache: 'no-store' });
  if (response.status === 204) return null;
  if (!response.ok) {
    throw new Error(`GET /palabra-profetica respondió ${response.status}`);
  }
  return response.json();
}

export default async function PalabraProfeticaPage() {
  const [palabra, t, tn] = await Promise.all([
    getPalabraProfeticaVigente(),
    getTranslations('palabraProfetica'),
    getTranslations('nosotros'),
  ]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
      <MigaDePan tramos={[{ label: tn('titulo'), href: '/nosotros' }, { label: t('titulo') }]} LinkComponente={Link} />

      {!palabra && (
        // FR-006: estado vacío amable, no un error ni una página en blanco.
        <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border p-6 text-center">
          <h1 className="text-xl font-medium">{t('vacioTitulo')}</h1>
          <p className="text-muted-foreground">{t('vacioTexto')}</p>
        </div>
      )}

      {palabra && (
        <>
          <h1 className="text-3xl font-semibold tracking-tight">
            {t('titulo')} {palabra.anio} — {palabra.titulo}
          </h1>
          {/* H-90/D127: Markdown renderizado en el servidor a un conjunto
              cerrado de elementos (MarkdownSeguro, packages/ui) — nunca
              dangerouslySetInnerHTML sobre lo guardado. Markdown vacío de
              marcas (el texto provisorio actual) se sigue viendo igual:
              un párrafo por bloque separado por línea en blanco, mismo
              tamaño/interlineado que antes. */}
          <MarkdownSeguro
            texto={palabra.texto}
            className="flex flex-col gap-4 text-lg leading-7 text-foreground [&_a]:underline [&_a]:underline-offset-4 [&_h2]:text-2xl [&_h2]:font-semibold [&_h3]:text-xl [&_h3]:font-semibold [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6"
          />
          {/* D121: el video es opcional — no se muestra nada si todavía no llegó. */}
          {palabra.youtubeVideoId && (
            <VideoYoutube videoId={palabra.youtubeVideoId} tituloVideo={palabra.titulo} />
          )}
        </>
      )}
    </div>
  );
}
