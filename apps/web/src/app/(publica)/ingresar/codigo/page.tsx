import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { destinoSeguro } from '@vida-sobrenatural/shared-types';
import { auth } from '../../../../auth';
import { COOKIE_EMAIL_INGRESO } from '../cookie';
import { IngresoPasoCodigo } from '../formulario-ingreso';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('ingreso');
  return { title: t('metaTitulo'), robots: { index: false } };
}

/**
 * spec 007 (T022): el paso del código. Con sesión, lo mismo que `/ingresar`
 * (lo resuelve esa página). Sin la cookie con el email (venció, o se entró
 * directo), vuelve a `/ingresar` a pedir el código. Sin `loading.tsx`, por
 * lo mismo que `/ingresar` (ver su page.tsx).
 */
export default async function IngresarCodigoPage({ searchParams }: { searchParams: Promise<{ destino?: string | string[] }> }) {
  const { destino: crudo } = await searchParams;
  const destino = typeof crudo === 'string' && crudo ? destinoSeguro(crudo) : undefined;
  const volver = destino ? `/ingresar?destino=${encodeURIComponent(destino)}` : '/ingresar';

  if (await auth()) redirect(volver);
  const email = (await cookies()).get(COOKIE_EMAIL_INGRESO)?.value;
  if (!email) redirect(volver);

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-12">
      <IngresoPasoCodigo email={email} destino={destino} />
    </div>
  );
}
