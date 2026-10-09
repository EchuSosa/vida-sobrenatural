import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

/** spec 014: un Grupo de Extensión que no existe. */
export default async function GrupoExtensionNoEncontrado() {
  const t = await getTranslations('gruposExtension');
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-16">
      <h1 className="text-2xl font-semibold">{t('noEncontrado')}</h1>
      <p className="text-muted-foreground">{t('noEncontradoTexto')}</p>
      <Link href="/grupos-extension" className="text-sm underline underline-offset-4">
        {t('volverLista')}
      </Link>
    </div>
  );
}
