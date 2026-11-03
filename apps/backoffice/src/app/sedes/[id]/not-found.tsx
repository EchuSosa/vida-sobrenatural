import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

// H-60 (revisión manual ronda 7): not-found.tsx propio de esta ruta —
// mismo mensaje y link "Volver a Sedes" que tenía el `noEncontrada` armado
// a mano en el page.tsx de cliente, ahora disparado con notFound().
export default async function SedeNoEncontrada() {
  const t = await getTranslations('sedes.noEncontrada');
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-16">
      <h1 className="text-2xl font-semibold">{t('titulo')}</h1>
      <Link href="/sedes" className="text-sm underline underline-offset-4">
        {t('volver')}
      </Link>
    </div>
  );
}
