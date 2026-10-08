import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

/** H2.8: una Persona que no existe — sin miga (no hay jerarquía que mostrar), con un enlace suelto al listado. */
export default async function PersonaNoEncontrada() {
  const t = await getTranslations('perfil');
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-16">
      <h1 className="text-2xl font-semibold">{t('noEncontradaTitulo')}</h1>
      <p className="text-muted-foreground">{t('noEncontradaTexto')}</p>
      <Link href="/personas" className="self-start underline underline-offset-4">
        {t('irAPersonas')}
      </Link>
    </div>
  );
}
