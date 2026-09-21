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
 */
export default function NosotrosPage() {
  const t = useTranslations('nosotros');
  const pastores = [
    { nombre: t('pastor1'), rol: t('pastor1Rol') },
    { nombre: t('pastor2'), rol: t('pastor2Rol') },
    { nombre: t('pastor3'), rol: t('pastor3Rol') },
  ];

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-16">
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">{t('titulo')}</h1>
        <h2 className="text-xl font-medium">{t('somosFamiliaTitulo')}</h2>
        <p className="text-lg leading-7 text-foreground">
          {t('somosFamiliaTexto')}
        </p>
      </div>

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
    </div>
  );
}
