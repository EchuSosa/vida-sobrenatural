import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { ButtonLink } from '@vida-sobrenatural/ui';

/** spec 009, T020: un Ministerio que no existe o está en pausa (no se ofrece en la app). */
export default async function MinisterioNoEncontrado() {
  const t = await getTranslations('ministerios');
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-16">
      <h1 className="text-2xl font-semibold">{t('noEncontradoTitulo')}</h1>
      <p className="text-base text-muted-foreground">{t('noEncontradoTexto')}</p>
      <ButtonLink render={<Link href="/mi-camino/ministerios" />} variant="outline" size="xl" className="w-full text-base sm:w-fit">
        {t('volverALista')}
      </ButtonLink>
    </div>
  );
}
