import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { PlaceholderImagen } from '@vida-sobrenatural/ui';

export const metadata = {
  title: 'Nosotros — Vida Sobrenatural',
  description: 'Quiénes somos, en qué creemos y nuestro liderazgo.',
};

/**
 * H-02 (revisión manual, actualización 2026-09-18): copy real de
 * docs/12-contenido-bienvenida.md, secciones "Somos Familia" y "Liderazgo".
 * "En qué creemos" y las fotos de cada pareja pastoral quedan pendientes de
 * material real — D98 no permite inventar una declaración de fe ni fotos, así
 * que se marcan como pendientes en vez de dejarse vacías o con lorem ipsum.
 *
 * FR-001 (spec 003, D109): el contenido institucional real (identidad,
 * historia, visión, misión, valores, sistema de trabajo, llamado,
 * congregación local) se agrega entre "Somos Familia" y "Liderazgo" — vive
 * en next-intl (D84), no en la base. El sistema de trabajo no repite el
 * texto completo de Primeros pasos (Acceptance Scenario 3): lo cuenta desde
 * la identidad de la iglesia y enlaza para el detalle paso a paso.
 */
export default function NosotrosPage() {
  const t = useTranslations('nosotros');
  const pastores = [
    { nombre: t('pastor1'), rol: t('pastor1Rol') },
    { nombre: t('pastor2'), rol: t('pastor2Rol') },
    { nombre: t('pastor3'), rol: t('pastor3Rol') },
  ];
  const identidad = [
    { label: t('identidadCristianosLabel'), texto: t('identidadCristianosTexto') },
    { label: t('identidadEvangelicosLabel'), texto: t('identidadEvangelicosTexto') },
    { label: t('identidadBautistasLabel'), texto: t('identidadBautistasTexto') },
  ];
  const valores = [t('valorCalidad'), t('valorUnidad'), t('valorGenerosidad'), t('valorFe')];
  const etapas = [
    { titulo: t('sistemaTrabajoBienvenidaTitulo'), texto: t('sistemaTrabajoBienvenidaTexto') },
    { titulo: t('sistemaTrabajoDiscipuladoTitulo'), texto: t('sistemaTrabajoDiscipuladoTexto') },
    { titulo: t('sistemaTrabajoRedTitulo'), texto: t('sistemaTrabajoRedTexto') },
  ];

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-16">
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">{t('titulo')}</h1>
        <h2 className="text-xl font-medium">{t('somosFamiliaTitulo')}</h2>
        <p className="text-lg leading-7 text-foreground">{t('somosFamiliaTexto')}</p>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-medium">{t('identidadTitulo')}</h2>
        <ul className="flex flex-col gap-2">
          {identidad.map((item) => (
            <li key={item.label} className="text-foreground">
              <span className="font-medium">{item.label}:</span> {item.texto}
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-medium">{t('historiaTitulo')}</h2>
        <p className="text-foreground">{t('historiaTexto1')}</p>
        <p className="text-foreground">{t('historiaTexto2')}</p>
      </section>

      <section className="flex flex-col gap-4 sm:grid sm:grid-cols-2 sm:gap-6">
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-medium">{t('visionTitulo')}</h2>
          <p className="text-foreground">{t('visionTexto')}</p>
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-medium">{t('misionTitulo')}</h2>
          <p className="text-foreground">{t('misionTexto')}</p>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-medium">{t('valoresTitulo')}</h2>
        <p className="text-foreground">{t('valoresIntro')}</p>
        <ul className="flex flex-wrap gap-3">
          {valores.map((valor) => (
            <li
              key={valor}
              className="rounded-full border border-border px-4 py-1.5 text-sm font-medium text-foreground"
            >
              {valor}
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-4">
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
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-medium">{t('llamadoTitulo')}</h2>
        <blockquote className="border-l-2 border-border pl-4 text-foreground italic">
          {t('llamadoCita')}
        </blockquote>
        <p className="text-foreground">{t('llamadoTexto')}</p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-medium">{t('congregacionLocalTitulo')}</h2>
        <p className="text-foreground">{t('congregacionLocalTexto')}</p>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-medium">{t('liderazgoTitulo')}</h2>
        <p className="text-foreground">{t('liderazgoIntro')}</p>
        <ul className="flex flex-col gap-4 sm:grid sm:grid-cols-3 sm:gap-3">
          {pastores.map((pastor) => (
            <li
              key={pastor.nombre}
              className="flex flex-col gap-2 rounded-lg border border-border p-4"
            >
              {/* D118 (docs/17): en Liderazgo el texto va visible, no solo aria-label — acá sí es honesto decir que falta la foto. */}
              <PlaceholderImagen aspecto="equipo" etiqueta={t('fotoPendiente')} mostrarTexto />
              <p className="font-medium">{pastor.nombre}</p>
              <p className="text-sm text-muted-foreground">{pastor.rol}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3 rounded-lg border border-dashed border-border p-5">
        <h2 className="text-xl font-medium">{t('enQueCreemosTitulo')}</h2>
        <p className="text-sm text-muted-foreground">{t('enQueCreemosPendiente')}</p>
      </section>

      {/* FR-003/D115: subpáginas de Nosotros, no ítems nuevos del menú principal. */}
      <nav aria-label={t('titulo')} className="flex flex-wrap gap-4 border-t border-border pt-6">
        <Link href="/nosotros/palabra-profetica" className="font-medium underline underline-offset-4">
          {t('palabraProfeticaEnlace')}
        </Link>
        <Link href="/nosotros/ediciones-vs" className="font-medium underline underline-offset-4">
          {t('edicionesVsEnlace')}
        </Link>
      </nav>
    </div>
  );
}
