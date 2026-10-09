import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

/** spec 014: un pedido de Grupo de Extensión que no existe — sin miga, con un enlace a la bandeja. */
export default async function SolicitudGexNoEncontrada() {
  const t = await getTranslations('gruposExtension.solicitud');
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-16">
      <h1 className="text-2xl font-semibold">{t('noEncontrada')}</h1>
      <Link href="/solicitudes" className="text-sm underline underline-offset-4">
        {t('irASolicitudes')}
      </Link>
    </div>
  );
}
