import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import type { MinisterioPublico } from '@vida-sobrenatural/shared-types';
import { ButtonLink, EstadoVacio, MigaDePan } from '@vida-sobrenatural/ui';
import { auth } from '../../../auth';

export const metadata = {
  title: 'Ministerios — Vida Sobrenatural',
  description: 'Los ministerios en los que servimos en Vida Sobrenatural.',
};

async function getMinisterios(): Promise<MinisterioPublico[]> {
  const baseUrl = process.env.API_BASE_URL ?? 'http://localhost:3333';
  const response = await fetch(`${baseUrl}/ministerios/publicos`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`GET /ministerios/publicos respondió ${response.status}`);
  return response.json();
}

/**
 * spec 009, T055 (FR-034) + docs/22 (decisión de Echu, 2026-10-08): la página
 * pública muestra SOLO el nombre y la línea pública de cada Ministerio — sin
 * áreas, requisitos ni audiciones (eso se ve en la app, al postularse). El
 * llamado a la acción lleva a Primeros pasos (sin sesión) o a Mi camino.
 * H-81/D115: la miga es siempre "Primeros pasos › Ministerios". Sin
 * Ministerios activos, el estado vacío de siempre; si la API falla, `error.tsx`.
 */
export default async function MinisteriosPage() {
  const [t, ministerios, session] = await Promise.all([getTranslations('ministerios'), getMinisterios(), auth()]);
  const conSesion = Boolean(session?.apiToken);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
      <MigaDePan tramos={[{ label: t('publico.migaPrimerosPasos'), href: '/primeros-pasos' }, { label: t('titulo') }]} LinkComponente={Link} />
      <h1 className="text-3xl font-semibold tracking-tight">{t('titulo')}</h1>
      {ministerios.length === 0 ? (
        <EstadoVacio mensaje={t('publico.vacio')} />
      ) : (
        <>
          <p className="text-base text-muted-foreground">{t('publico.introduccion')}</p>
          <ul className="grid gap-3 sm:grid-cols-2">
            {ministerios.map((m) => (
              <li key={m.id} className="flex flex-col gap-1 rounded-lg border border-border p-4">
                <h2 className="text-lg font-semibold break-words">{m.nombre}</h2>
                {m.lineaPublica && <p className="text-base text-muted-foreground">{m.lineaPublica}</p>}
              </li>
            ))}
          </ul>
          <section aria-labelledby="sumarte-titulo" className="flex flex-col gap-3 rounded-lg border border-border p-5">
            <h2 id="sumarte-titulo" className="text-xl font-semibold">
              {t('publico.ctaTitulo')}
            </h2>
            <p className="text-base text-muted-foreground">{conSesion ? t('publico.ctaConSesionTexto') : t('publico.ctaSinSesionTexto')}</p>
            <ButtonLink render={<Link href={conSesion ? '/mi-camino' : '/primeros-pasos'} />} size="xl" className="w-full text-base sm:w-fit">
              {conSesion ? t('publico.ctaConSesion') : t('publico.ctaSinSesion')}
            </ButtonLink>
          </section>
        </>
      )}
    </div>
  );
}
