import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

/** Una Solicitud que no existe: sin miga (no hay jerarquía que mostrar), con un enlace suelto a la bandeja. */
export default async function SolicitudNoEncontrada() {
  const t = await getTranslations('solicitudes.detalle');
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-16">
      <h1 className="text-2xl font-semibold">{t('noEncontradaTitulo')}</h1>
      <Link href="/solicitudes" className="text-sm underline underline-offset-4">
        {t('irASolicitudes')}
      </Link>
    </div>
  );
}
