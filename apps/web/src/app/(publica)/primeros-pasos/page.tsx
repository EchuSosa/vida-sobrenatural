import Image from 'next/image';
import Link from 'next/link';
import { Suspense } from 'react';
import { useTranslations } from 'next-intl';
import { ButtonLink, HeroConFoto } from '@vida-sobrenatural/ui';
import { AccionRegistro } from '../../../components/accion-registro';
import { AvisoPorQuery } from '../../../components/aviso-por-query';
import imgCabecera from '@/assets/images/cards/card-bienvenida-equipo.webp';

// docs/claude_20-fotos-web-publica.md: la caja respeta la proporción de
// `cards/` (4:3, R2) — ninguna imagen de esa carpeta se estira a 16:9.
const SIZES_CABECERA = '(min-width: 768px) 768px, 100vw';

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
      {/* docs/claude_20-fotos-web-publica.md, "Primeros pasos" › Cabecera:
          de los siete bloques que asigna el documento, esta es la ÚNICA
          que existe como sección propia hoy (R5 del lote de fotos — ver el
          reporte de la conversación para el resto). El <h1> ya existente
          pasa a vivir sobre la foto, mismo componente/velo que Inicio. */}
      <HeroConFoto
        className="aspect-[4/3]"
        foto={<Image src={imgCabecera} alt={t('cabeceraAlt')} fill sizes={SIZES_CABECERA} priority className="object-cover" />}
      >
        <h1 className="text-3xl font-semibold tracking-tight">{t('titulo')}</h1>
      </HeroConFoto>

      {/* H-02 (revisión manual, actualización 2026-09-18): copy real de
          docs/12-contenido-bienvenida.md, sección "Hero". */}
      <blockquote className="border-l-2 border-primary pl-4 italic text-muted-foreground">
        “{t('fraseTexto')}”
        <footer className="mt-1 text-sm not-italic">— {t('fraseAutor')}</footer>
      </blockquote>

      <p className="text-lg leading-7 text-foreground">{t('intro')}</p>

      <section className="flex flex-col gap-3 rounded-lg border border-border p-5">
        <h2 className="text-xl font-medium">{t('comoSigue')}</h2>
        <p className="text-foreground">{t('comoSigueDescripcion')}</p>
        {/*
          H-55 (revisión manual, D81/WCAG 1.4.1): los cuatro pasos se ven
          iguales — antes el paso 4 era un <Link> distinguido solo por color
          (con subrayado recién al pasar el mouse, que en celular no existe).
          El enlace a /ministerios va aparte, explícito, debajo de la lista.
        */}
        <ol className="flex flex-col gap-2 text-foreground">
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
            {/* H-46 (D115): Ministerios pasa adentro de Primeros pasos, como
                última etapa — deja de estar en el menú principal pero
                conserva su URL propia (/ministerios) y su entrada en el
                sitemap (D82). */}
            <strong>{t('paso4')}</strong> — {t('paso4Descripcion')}
          </li>
        </ol>
        <Link href="/ministerios" className="w-fit font-medium text-primary underline underline-offset-2">
          {t('conoceMinisterios')}
        </Link>
        <p className="text-sm text-muted-foreground">{t('notaFinal')}</p>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row">
        <ButtonLink render={<Link href="/visitanos" />} size="xl">
          {t('verSede')}
        </ButtonLink>
        <AccionRegistro />
      </div>
    </div>
  );
}
