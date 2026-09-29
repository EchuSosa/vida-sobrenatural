import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

export default async function GrupoNoEncontrado() {
  const t = await getTranslations('grupos.noEncontrado');
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-16">
      <h1 className="text-2xl font-semibold">{t('titulo')}</h1>
      <Link href="/grupos" className="inline-flex min-h-11 items-center text-sm underline underline-offset-4">
        {t('volver')}
      </Link>
    </div>
  );
}
