import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { MigaDePan } from '@vida-sobrenatural/ui';

export const metadata = {
  title: 'En qué creemos — Vida Sobrenatural',
  description: 'Nuestra declaración de fe.',
};

/**
 * D122/H-77: subpágina nueva de Nosotros — antes era la sección "En qué
 * creemos" de la página larga, sin cambios de contenido (FR-002): sigue
 * pendiente de la declaración de fe real (D98, no se inventa).
 */
export default function EnQueCreemosPage() {
  const t = useTranslations('enQueCreemos');
  const tn = useTranslations('nosotros');

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-16">
      <MigaDePan tramos={[{ label: tn('titulo'), href: '/nosotros' }, { label: t('titulo') }]} LinkComponente={Link} />
      <h1 className="text-3xl font-semibold tracking-tight">{t('titulo')}</h1>
      <div className="flex flex-col gap-3 rounded-lg border border-dashed border-border bg-secondary p-5">
        <p className="text-sm text-muted-foreground">{t('pendiente')}</p>
      </div>
    </div>
  );
}
