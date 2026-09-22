import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { MigaDePan } from '@vida-sobrenatural/ui';

export const metadata = {
  title: 'Visión, misión y valores — Vida Sobrenatural',
  description: 'Hacia dónde vamos, nuestros valores, cómo trabajamos con cada persona y nuestro llamado.',
};

/**
 * D122/H-77: subpágina nueva de Nosotros. Visión, misión, valores, el
 * sistema de trabajo Bienvenida → Discipulado → Red y el llamado de Isaías
 * 61 quedan juntos: todo responde a "hacia dónde vamos y cómo". Fondo
 * alternado entre secciones con los tokens existentes (D118).
 */
export default function VisionMisionValoresPage() {
  const t = useTranslations('visionMisionValores');
  const tn = useTranslations('nosotros');
  const valores = [t('valorCalidad'), t('valorUnidad'), t('valorGenerosidad'), t('valorFe')];
  const etapas = [
    { titulo: t('sistemaTrabajoBienvenidaTitulo'), texto: t('sistemaTrabajoBienvenidaTexto') },
    { titulo: t('sistemaTrabajoDiscipuladoTitulo'), texto: t('sistemaTrabajoDiscipuladoTexto') },
    { titulo: t('sistemaTrabajoRedTitulo'), texto: t('sistemaTrabajoRedTexto') },
  ];

  return (
    <div className="flex flex-col">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 pb-4 pt-16">
        <MigaDePan tramos={[{ label: tn('titulo'), href: '/nosotros' }, { label: t('titulo') }]} LinkComponente={Link} />
        <h1 className="text-3xl font-semibold tracking-tight">{t('titulo')}</h1>
      </div>

      <section className="bg-background">
        <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-12 sm:grid sm:grid-cols-2 sm:gap-6">
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-medium">{t('visionTitulo')}</h2>
            <p className="text-foreground">{t('visionTexto')}</p>
          </div>
          <div className="flex flex-col gap-2">
            <h2 className="text-xl font-medium">{t('misionTitulo')}</h2>
            <p className="text-foreground">{t('misionTexto')}</p>
          </div>
        </div>
      </section>

      <section className="bg-secondary">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-12">
          <h2 className="text-xl font-medium">{t('valoresTitulo')}</h2>
          <p className="text-foreground">{t('valoresIntro')}</p>
          <ul className="flex flex-wrap gap-3">
            {valores.map((valor) => (
              <li
                key={valor}
                className="rounded-full border border-border bg-background px-4 py-1.5 text-sm font-medium text-foreground"
              >
                {valor}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-background">
        <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-12">
          <h2 className="text-xl font-medium">{t('sistemaTrabajoTitulo')}</h2>
          <p className="text-foreground">{t('sistemaTrabajoIntro')}</p>
          <ol className="flex flex-col gap-4">
            {etapas.map((etapa) => (
              <li key={etapa.titulo} className="flex flex-col gap-1 rounded-lg border border-border p-4">
                <p className="font-medium">{etapa.titulo}</p>
                <p className="text-sm text-muted-foreground">{etapa.texto}</p>
              </li>
            ))}
          </ol>
          <Link href="/primeros-pasos" className="text-sm font-medium underline underline-offset-4">
            {t('primerosPasosEnlace')}
          </Link>
        </div>
      </section>

      <section className="bg-secondary">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-12 pb-16">
          <h2 className="text-xl font-medium">{t('llamadoTitulo')}</h2>
          <blockquote className="border-l-2 border-border pl-4 text-foreground italic">{t('llamadoCita')}</blockquote>
          <p className="text-foreground">{t('llamadoTexto')}</p>
        </div>
      </section>
    </div>
  );
}
