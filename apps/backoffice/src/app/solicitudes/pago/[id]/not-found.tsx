import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

export default async function PagoNoEncontrado() {
  const t = await getTranslations('eventos.pagos');
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-16">
      <h1 className="text-2xl font-semibold">{t('noEncontrado')}</h1>
      <Link href="/solicitudes" className="text-sm underline underline-offset-4">
        {t('volverBandeja')}
      </Link>
    </div>
  );
}
