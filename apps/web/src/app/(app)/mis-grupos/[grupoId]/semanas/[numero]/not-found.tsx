import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

/** spec 008: una semana o una edición que no existe o no es tuya. */
export default async function SemanaNoEncontrada() {
  const t = await getTranslations('misGrupos');
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-16">
      <h1 className="text-2xl font-semibold">{t('material.noEncontradaTitulo')}</h1>
      <Link href="/mis-grupos" className="flex min-h-11 items-center text-base text-primary underline underline-offset-2">
        {t('volverAMisGrupos')}
      </Link>
    </div>
  );
}
