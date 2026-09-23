import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { MigaDePan, PlaceholderImagen } from '@vida-sobrenatural/ui';
import imgPastorJp from '@/assets/images/retratos/retrato-pastor-jp.webp';

export const metadata = {
  title: 'Liderazgo — Vida Sobrenatural',
  description: 'Las parejas pastorales que guían Vida Sobrenatural.',
};

/**
 * D122/H-77: subpágina nueva de Nosotros — antes era la sección "Liderazgo"
 * de la página larga, sin cambios de contenido (FR-002). Fondo alternado
 * entre secciones con los tokens existentes (D118).
 *
 * docs/claude_20-fotos-web-publica.md: dos de las tres parejas ya tienen
 * retrato real (1:1, carpeta `retratos/`); pastor3 sigue con placeholder.
 * `pastor1FotoAlt`/`pastor2FotoAlt` (es.json) son **provisorios**: el
 * documento no da el alt de estos dos archivos, y de `retrato-predicador-swoosh`
 * ni siquiera dice a cuál de las tres parejas corresponde (solo que es "un
 * predicador" con el swoosh de la marca) — se lo puso en la posición de
 * pastor2 por orden, no por identidad confirmada. PENDIENTE: que Echu
 * confirme (a) el texto alternativo real de los dos retratos y (b) si
 * retrato-predicador-swoosh es efectivamente parte de la pareja de pastor2
 * (Lorena Scerra y Ezequiel Rossini) o de otra — no inventar la escena ni la
 * identidad mientras tanto (ya pasó una vez).
 */
export default function LiderazgoPage() {
  const t = useTranslations('liderazgo');
  const tn = useTranslations('nosotros');
  const pastores = [
    { nombre: t('pastor1'), rol: t('pastor1Rol'), imagen: imgPastorJp, alt: t('pastor1FotoAlt') },
    // 2026-09-23: `retratos/retrato-predicador-swoosh.webp` estaba acá y se
    // sacó. El documento no dice a quién retrata, y la foto muestra a UNA
    // persona en una posición que nombra a DOS. Que el alt no afirmara una
    // identidad no alcanzaba: la posición en la grilla la afirma igual, y con
    // más fuerza que cualquier texto. Una cara real presentada como líder de
    // la iglesia sin que nadie lo haya confirmado es exactamente lo que D98
    // no permite. Vuelve cuando Echu confirme de quién es la foto.
    { nombre: t('pastor2'), rol: t('pastor2Rol'), imagen: null, alt: null },
    { nombre: t('pastor3'), rol: t('pastor3Rol'), imagen: null, alt: null },
  ];

  return (
    <div className="flex flex-col">
      <section className="bg-background">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-16">
          <MigaDePan tramos={[{ label: tn('titulo'), href: '/nosotros' }, { label: t('titulo') }]} LinkComponente={Link} />
          <h1 className="text-3xl font-semibold tracking-tight">{t('titulo')}</h1>
          <p className="text-foreground">{t('intro')}</p>
        </div>
      </section>

      <section className="bg-secondary">
        <div className="mx-auto max-w-3xl px-4 py-12 pb-16">
          <ul className="flex flex-col gap-4 sm:grid sm:grid-cols-3 sm:gap-3">
            {pastores.map((pastor) => (
              <li key={pastor.nombre} className="flex flex-col gap-2 rounded-lg border border-border bg-background p-4">
                {pastor.imagen && pastor.alt ? (
                  <div className="relative aspect-square w-full overflow-hidden rounded-md">
                    <Image
                      src={pastor.imagen}
                      alt={pastor.alt}
                      fill
                      sizes="(min-width: 640px) 33vw, 100vw"
                      className="object-cover"
                    />
                  </div>
                ) : (
                  // H-82: el texto "Foto pendiente" ya no se muestra — el
                  // hueco con la marca de agua alcanza para comunicarlo, y
                  // mostrarlo le cuenta a quien visita la web un problema
                  // interno nuestro. La etiqueta sigue como aria-label.
                  <PlaceholderImagen aspecto="retrato" etiqueta={t('fotoPendiente')} />
                )}
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
