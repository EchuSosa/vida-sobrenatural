import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { MigaDePan } from '@vida-sobrenatural/ui';
import { auth } from '../../../../auth';
import { FormularioBaja } from './formulario-baja';

/** spec 018, US1 (D261–D264): qué pasa al darse de baja, en palabras simples, y la confirmación. */
export default async function BajaPage() {
  const session = await auth();
  const t = await getTranslations('perfil.baja');
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
      <MigaDePan tramos={[{ label: t('miga'), href: '/perfil' }, { label: t('titulo') }]} LinkComponente={Link} />
      <h1 className="text-3xl font-semibold tracking-tight">{t('titulo')}</h1>
      <div className="flex flex-col gap-3 text-base">
        <p>{t('intro')}</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>{t('queSeBorra')}</li>
          <li>{t('queSeCierra')}</li>
          <li>{t('queQueda')}</li>
        </ul>
        <p className="font-medium">{t('noSeDeshace')}</p>
        <p className="text-muted-foreground">{t('volver')}</p>
      </div>
      <FormularioBaja apiToken={session?.apiToken ?? ''} />
    </div>
  );
}
