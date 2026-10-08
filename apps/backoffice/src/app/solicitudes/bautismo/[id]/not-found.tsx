import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

/** spec 010, T029: una Solicitud de Bautismo que no existe — con un enlace a la bandeja. */
export default async function BautismoNoEncontrado() {
  const t = await getTranslations('solicitudes.bautismo');
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-16">
      <h1 className="text-2xl font-semibold">{t('noEncontradaTitulo')}</h1>
      <Link href="/solicitudes" className="text-sm underline underline-offset-4">
        {t('irASolicitudes')}
      </Link>
    </div>
  );
}
