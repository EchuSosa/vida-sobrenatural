import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

/** spec 012, T025 — Principio V: lo ajeno y lo inexistente se ven igual. */
export default async function AvisoNoEncontrado() {
  const t = await getTranslations('avisos');
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-16">
      <h1 className="text-2xl font-semibold">{t('noEncontrado.titulo')}</h1>
      <p className="text-base text-muted-foreground">{t('noEncontrado.texto')}</p>
      <Link href="/avisos" className="inline-flex min-h-11 items-center text-base underline underline-offset-4 hover:no-underline">
        {t('volver')}
      </Link>
    </div>
  );
}
