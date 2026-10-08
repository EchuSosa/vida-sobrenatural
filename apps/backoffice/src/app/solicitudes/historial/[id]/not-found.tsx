import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

/** spec 006, T046: un "Ya lo hice" que no existe — sin miga, con un enlace suelto a la bandeja. */
export default async function DeclaracionNoEncontrada() {
  const t = await getTranslations('historialPrevio');
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-16">
      <h1 className="text-2xl font-semibold">{t('noEncontradaTitulo')}</h1>
      <Link href="/solicitudes" className="text-sm underline underline-offset-4">
        {t('irASolicitudes')}
      </Link>
    </div>
  );
}
