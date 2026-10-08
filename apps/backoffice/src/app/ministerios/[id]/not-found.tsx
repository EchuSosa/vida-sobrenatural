import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

/** spec 009, T042: un Ministerio que no existe o está en la papelera (se ve y restaura desde ahí). */
export default async function MinisterioNoEncontrado() {
  const t = await getTranslations('ministerios');
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-16">
      <h1 className="text-2xl font-semibold">{t('noEncontradoTitulo')}</h1>
      <Link href="/ministerios" className="text-sm underline underline-offset-4">
        {t('volverALista')}
      </Link>
    </div>
  );
}
