import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

/** spec 013 (T065): un comentario que no existe — con la salida al listado. */
export default async function ComentarioNoEncontrado() {
  const t = await getTranslations('comentarios');
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-16">
      <h1 className="text-2xl font-semibold">{t('noEncontradoTitulo')}</h1>
      <p className="text-muted-foreground">{t('noEncontradoTexto')}</p>
      <Link href="/comentarios" className="inline-flex min-h-11 items-center self-start underline underline-offset-4">
        {t('volver')}
      </Link>
    </div>
  );
}
