import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

/** spec 011, FR-043 — un Evento eliminado o inexistente: "No encontramos esta página". */
export default async function EventoNoEncontrado() {
  const t = await getTranslations('eventos.publico.noEncontrado');
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">{t('titulo')}</h1>
      <p className="text-lg">{t('texto')}</p>
      <Link href="/eventos" className="w-fit text-base font-medium underline underline-offset-4 hover:no-underline">
        {t('volver')}
      </Link>
    </div>
  );
}
