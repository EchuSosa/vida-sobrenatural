import Link from 'next/link';
import { Suspense } from 'react';
import { useTranslations } from 'next-intl';
import { AccionRegistro } from '../../../components/accion-registro';
import { AvisoPorQuery } from '../../../components/aviso-por-query';

export const metadata = {
  title: 'Primeros pasos — Vida Sobrenatural',
  description:
    'Qué es la Bienvenida y cómo sigue el proceso de integración en Vida Sobrenatural.',
};

export default function PrimerosPasosPage() {
  const t = useTranslations('primerosPasos');

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
      {/* H-16: aviso breve si llegó acá porque /registro la redirigió (ya activa) */}
      <Suspense fallback={null}>
        <AvisoPorQuery param="ya_registrado" valor="1" mensaje={t('avisoYaRegistrado')} />
      </Suspense>
      <h1 className="text-3xl font-semibold tracking-tight">{t('titulo')}</h1>

      {/* H-02 (revisión manual, actualización 2026-09-18): copy real de
          docs/12-contenido-bienvenida.md, sección "Hero". */}
      <blockquote className="border-l-2 border-primary pl-4 italic text-zinc-600 dark:text-zinc-400">
        “{t('fraseTexto')}”
        <footer className="mt-1 text-sm not-italic">— {t('fraseAutor')}</footer>
      </blockquote>

      <p className="text-lg leading-7 text-zinc-700 dark:text-zinc-300">{t('intro')}</p>

      <section className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-5 dark:border-zinc-800">
        <h2 className="text-xl font-medium">{t('comoSigue')}</h2>
        <p className="text-zinc-700 dark:text-zinc-300">{t('comoSigueDescripcion')}</p>
        <ol className="flex flex-col gap-2 text-zinc-700 dark:text-zinc-300">
          <li>
            <strong>{t('paso1')}</strong> — {t('paso1Descripcion')}
          </li>
          <li>
            <strong>{t('paso2')}</strong> — {t('paso2Descripcion')}
          </li>
          <li>
            <strong>{t('paso3')}</strong> — {t('paso3Descripcion')}
          </li>
          <li>
            <strong>{t('paso4')}</strong> — {t('paso4Descripcion')}
          </li>
        </ol>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{t('notaFinal')}</p>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/visitanos"
          className="flex h-11 items-center justify-center rounded-lg bg-primary px-5 text-center font-medium text-primary-foreground transition-colors hover:bg-primary/80"
        >
          {t('verSede')}
        </Link>
        <AccionRegistro />
      </div>
    </div>
  );
}
