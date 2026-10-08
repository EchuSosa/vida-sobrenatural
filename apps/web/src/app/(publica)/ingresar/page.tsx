import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { destinoSeguro } from '@vida-sobrenatural/shared-types';
import { auth } from '../../../auth';
import { IngresoPasoEmail } from './formulario-ingreso';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('ingreso');
  return { title: t('metaTitulo'), robots: { index: false } };
}

/**
 * spec 007 (T021): la pantalla de ingreso de la web — Google o código por
 * email (FR-001). Sin sesión, la pantalla; con sesión, las mismas
 * redirecciones que antes según el estado real de la Persona (H-85):
 * - `activa` → el `destino` si es una ruta interna (`destinoSeguro`, lo usa la
 *   011 para volver a un Evento) o `/inicio`.
 * - `pendiente_tutor` → `/pendiente-tutor` (ya interceptado en el callback
 *   `signIn` de `auth.ts`: esto es una red adicional).
 * - `null` (sin Persona todavía) → `/registro`, para completarlo.
 *
 * Sin `loading.tsx` a propósito (Principio VIII): la página no espera ningún
 * dato (`auth()` solo lee la cookie de sesión) y un `loading.tsx` envolvería
 * la página en Suspense, con lo que estas redirecciones dejarían de ser un
 * 307 y pasarían a ser una página 200 con un `meta refresh`. El estado
 * "cargando" de esta pantalla es el del botón mientras se envía (H-57).
 */
export default async function IngresarPage({ searchParams }: { searchParams: Promise<{ destino?: string | string[] }> }) {
  const session = await auth();
  const { destino: crudo } = await searchParams;
  const destino = typeof crudo === 'string' && crudo ? destinoSeguro(crudo) : undefined;

  if (session?.user.estado === 'activa') redirect(destino ?? destinoSeguro(undefined));
  if (session?.user.estado === 'pendiente_tutor') redirect('/pendiente-tutor');
  if (session) redirect('/registro');

  const t = await getTranslations('ingreso');
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">{t('titulo')}</h1>
        <p className="text-base text-muted-foreground">{t('intro')}</p>
      </div>
      <IngresoPasoEmail destino={destino} />
    </div>
  );
}
