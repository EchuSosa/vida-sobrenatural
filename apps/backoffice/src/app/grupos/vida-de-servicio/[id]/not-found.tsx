import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

/** spec 008, T061: una edición que no existe. */
export default async function EdicionNoEncontrada() {
  const t = await getTranslations('edicionesServicio.detalle');
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-16">
      <h1 className="text-2xl font-semibold">{t('noEncontradaTitulo')}</h1>
      <Link href="/grupos?curso=vida_de_servicio" className="text-sm underline underline-offset-4">
        {t('irAGrupos')}
      </Link>
    </div>
  );
}
