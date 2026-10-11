import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { apiFetch, type MinisterioParaElegir } from '@vida-sobrenatural/shared-types';
import { MigaDePan } from '@vida-sobrenatural/ui';
import { auth } from '../../../../../auth';
import { FormularioYaSirvo } from './formulario-ya-sirvo';

/**
 * spec 015 (D243): "Ya sirvo en un ministerio" — para quien ya sirve antes de
 * usar la app: elige del mismo listado que la elección (hasta 2 ministerios y
 * un área de cada uno, Discipulados Vida Nueva aparte) y, si quiere, desde qué
 * año. El equipo lo confirma; mientras tanto la card lo muestra "en revisión".
 */
export default async function YaSirvoPage() {
  const session = await auth();
  const [t, tMiCamino] = await Promise.all([getTranslations('yaSirvo'), getTranslations('miCamino')]);
  const catalogo = await apiFetch<MinisterioParaElegir[]>('/elecciones-ministerio/me/catalogo', {
    headers: { Authorization: `Bearer ${session?.apiToken}` },
    cache: 'no-store',
  });
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
      <MigaDePan tramos={[{ label: tMiCamino('titulo'), href: '/mi-camino' }, { label: t('titulo') }]} LinkComponente={Link} />
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">{t('titulo')}</h1>
        <p className="text-base text-muted-foreground">{t('introduccion')}</p>
      </div>
      <FormularioYaSirvo catalogo={catalogo} />
    </div>
  );
}
