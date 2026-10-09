import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

/** spec 012, T050 — un aviso manual que no existe (o uno automático) se ve igual: "no encontramos". */
export default async function AvisoNoEncontrado() {
  const t = await getTranslations('notificaciones');
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-16">
      <h1 className="text-2xl font-semibold">{t('noEncontrado.titulo')}</h1>
      <p className="text-muted-foreground">{t('noEncontrado.texto')}</p>
      <Link href="/notificaciones" className="inline-flex min-h-11 items-center underline underline-offset-4 hover:no-underline">
        {t('detalle.volver')}
      </Link>
    </div>
  );
}
