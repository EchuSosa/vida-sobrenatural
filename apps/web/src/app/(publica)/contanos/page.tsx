import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { auth } from '../../../auth';
import { ContanosCliente } from './contanos-cliente';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('comentarios');
  return { title: t('metaTitulo'), robots: { index: false, follow: false } };
}

/**
 * spec 013 (T064, Historia 5; FR-040, FR-045): "Contanos qué te parece" —
 * pública, con o sin sesión. `?desde=` es la pantalla desde donde se abrió
 * (la arma el enlace del pie y de Perfil), solo el path: se guarda como
 * página de origen y es a donde vuelve "Volver a donde estabas".
 */
export default async function ContanosPage({ searchParams }: { searchParams: Promise<{ desde?: string | string[] }> }) {
  const [session, { desde }, t] = await Promise.all([auth(), searchParams, getTranslations('comentarios')]);
  const crudo = typeof desde === 'string' ? desde.split(/[?#]/)[0]! : '';
  // Solo un path propio (nunca otro sitio ni "//host").
  const paginaOrigen = crudo.startsWith('/') && !crudo.startsWith('//') && crudo.length <= 200 ? crudo : '/contanos';
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-12">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">{t('titulo')}</h1>
        <p className="text-muted-foreground">{t('descripcion')}</p>
      </div>
      <ContanosCliente conSesion={Boolean(session?.user.personaId)} paginaOrigen={paginaOrigen} />
    </div>
  );
}
