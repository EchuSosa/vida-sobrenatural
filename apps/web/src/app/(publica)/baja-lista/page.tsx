import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

/** spec 018, US1: la despedida, ya sin sesión. */
export default async function BajaListaPage() {
  const t = await getTranslations('perfil.baja');
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">{t('listaTitulo')}</h1>
      <p className="text-base">{t('listaTexto')}</p>
      <Link href="/" className="inline-flex min-h-11 w-fit items-center text-base font-medium text-primary underline underline-offset-4">
        {t('listaInicio')}
      </Link>
    </div>
  );
}
