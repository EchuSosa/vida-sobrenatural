import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

/** spec 008, T032: un pedido de Vida de Servicio que no existe — sin miga, con un enlace suelto a la bandeja. */
export default async function SolicitudVsNoEncontrada() {
  const t = await getTranslations('solicitudesServicio');
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-16">
      <h1 className="text-2xl font-semibold">{t('noEncontradaTitulo')}</h1>
      <Link href="/solicitudes" className="text-sm underline underline-offset-4">
        {t('irASolicitudes')}
      </Link>
    </div>
  );
}
