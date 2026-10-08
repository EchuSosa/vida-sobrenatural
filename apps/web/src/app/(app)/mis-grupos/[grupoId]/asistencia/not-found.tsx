import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

/** spec 008 (FR-019): una edición que no existe o que no es tuya — no se distingue. */
export default async function MiGrupoNoEncontrado() {
  const t = await getTranslations('misGrupos');
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-16">
      <h1 className="text-2xl font-semibold">{t('noEncontradoTitulo')}</h1>
      <Link href="/mis-grupos" className="flex min-h-11 items-center text-base text-primary underline underline-offset-2">
        {t('volverAMisGrupos')}
      </Link>
    </div>
  );
}
