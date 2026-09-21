import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { PlaceholderImagen } from '@vida-sobrenatural/ui';

export const metadata = {
  title: 'Liderazgo — Vida Sobrenatural',
  description: 'Las parejas pastorales que guían Vida Sobrenatural.',
};

/**
 * D122/H-77: subpágina nueva de Nosotros — antes era la sección "Liderazgo"
 * de la página larga, sin cambios de contenido (FR-002). Fondo alternado
 * entre secciones con los tokens existentes (D118).
 */
export default function LiderazgoPage() {
  const t = useTranslations('liderazgo');
  const pastores = [
    { nombre: t('pastor1'), rol: t('pastor1Rol') },
    { nombre: t('pastor2'), rol: t('pastor2Rol') },
    { nombre: t('pastor3'), rol: t('pastor3Rol') },
  ];

  return (
    <div className="flex flex-col">
      <section className="bg-background">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-16">
          <Link href="/nosotros" className="text-sm font-medium underline underline-offset-4">
            {t('volver')}
          </Link>
          <h1 className="text-3xl font-semibold tracking-tight">{t('titulo')}</h1>
          <p className="text-foreground">{t('intro')}</p>
        </div>
      </section>

      <section className="bg-secondary">
        <div className="mx-auto max-w-3xl px-4 py-12 pb-16">
          <ul className="flex flex-col gap-4 sm:grid sm:grid-cols-3 sm:gap-3">
            {pastores.map((pastor) => (
              <li key={pastor.nombre} className="flex flex-col gap-2 rounded-lg border border-border bg-background p-4">
                {/* D118 (docs/17): en Liderazgo el texto va visible, no solo aria-label — acá sí es honesto decir que falta la foto. */}
                <PlaceholderImagen aspecto="equipo" etiqueta={t('fotoPendiente')} mostrarTexto />
                <p className="font-medium">{pastor.nombre}</p>
                <p className="text-sm text-muted-foreground">{pastor.rol}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
