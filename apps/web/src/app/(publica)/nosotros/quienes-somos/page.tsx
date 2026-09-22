import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { MigaDePan } from '@vida-sobrenatural/ui';

export const metadata = {
  title: 'Quiénes somos — Vida Sobrenatural',
  description: 'Nuestra identidad, nuestra historia y nuestra congregación local.',
};

/**
 * D122/H-77: subpágina nueva de Nosotros. Identidad, historia y
 * congregación local eran tres secciones sueltas en la página larga; acá
 * quedan juntas porque, como dice H-77, juntas son un relato: quiénes somos,
 * de dónde venimos y por qué elegimos pertenecer a una congregación local.
 * Fondo alternado entre secciones con los tokens existentes (D118), sin
 * animaciones nuevas.
 */
export default function QuienesSomosPage() {
  const t = useTranslations('quienesSomos');
  const tn = useTranslations('nosotros');
  const identidad = [
    { label: t('identidadCristianosLabel'), texto: t('identidadCristianosTexto') },
    { label: t('identidadEvangelicosLabel'), texto: t('identidadEvangelicosTexto') },
    { label: t('identidadBautistasLabel'), texto: t('identidadBautistasTexto') },
  ];

  return (
    <div className="flex flex-col">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 pb-4 pt-16">
        {/* H-81/H-95: la miga de pan reemplaza el enlace "Volver a X" — la
            ruta sale de la jerarquía de la página, no del historial. */}
        <MigaDePan tramos={[{ label: tn('titulo'), href: '/nosotros' }, { label: t('titulo') }]} LinkComponente={Link} />
        <h1 className="text-3xl font-semibold tracking-tight">{t('titulo')}</h1>
      </div>

      <section className="bg-background">
        <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-12">
          <h2 className="text-xl font-medium">{t('identidadTitulo')}</h2>
          <ul className="flex flex-col gap-2">
            {identidad.map((item) => (
              <li key={item.label} className="text-foreground">
                <span className="font-medium">{item.label}:</span> {item.texto}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-secondary">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-12">
          <h2 className="text-xl font-medium">{t('historiaTitulo')}</h2>
          <p className="text-foreground">{t('historiaTexto1')}</p>
          <p className="text-foreground">{t('historiaTexto2')}</p>
        </div>
      </section>

      <section className="bg-background">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-12 pb-16">
          <h2 className="text-xl font-medium">{t('congregacionLocalTitulo')}</h2>
          <p className="text-foreground">{t('congregacionLocalTexto')}</p>
        </div>
      </section>
    </div>
  );
}
