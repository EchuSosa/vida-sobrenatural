import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { PlaceholderImagen } from '@vida-sobrenatural/ui';
import imgQuienesSomos from '@/assets/images/cards/card-comunidad-risas.webp';
import imgVisionMisionValores from '@/assets/images/hero/hero-adoracion-mujeres.webp';
import imgLiderazgo from '@/assets/images/cards/card-pastores-pareja.webp';
import imgEnQueCreemos from '@/assets/images/cards/card-estudio-cuaderno.webp';
import imgPalabraProfetica from '@/assets/images/cards/card-pastora-oracion.webp';

export const metadata = {
  title: 'Nosotros — Vida Sobrenatural',
  description: 'Quiénes somos, en qué creemos y nuestro liderazgo.',
};

// docs/claude_20-fotos-web-publica.md, sección "Nosotros": tamaño acorde al
// grid de dos columnas (sm+) / una columna (celular).
const SIZES_TARJETA = '(max-width: 639px) 112px, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw';

/**
 * D122/H-77: Nosotros pasa de una página larga a una entrada corta ("Somos
 * Familia") más una grilla de seis tarjetas hacia sus subpáginas — cuatro
 * nuevas (Quiénes somos, Visión/misión/valores, Liderazgo, En qué creemos) y
 * dos que ya existían con su URL sin cambios (Palabra Profética, Ediciones
 * VS, D115). El motivo: reunidas acá, las seis secciones hacían una sola
 * página larguísima de leer y de indexar.
 *
 * docs/claude_20-fotos-web-publica.md: cinco de las seis ya tienen foto real
 * (carpeta `cards/`, 4:3 — `hero-adoracion-mujeres` es la única excepción
 * autorizada, 16:9 recortado en CSS a 4:3 vía `object-cover`). Ediciones VS
 * queda sin foto (el documento sugiere la primera portada de libro cargada,
 * pero eso agregaría una consulta a la API a una página que hoy no consulta
 * nada) — su `PlaceholderImagen` pasa de aspecto="equipo" a "tarjeta" (4:3,
 * no 3:2) para que la grilla quede pareja con las cinco que sí tienen foto.
 *
 * 2026-09-23 (H-79): la PRIMERA tarjeta (Quiénes somos) lleva `priority` —
 * Next detectó en runtime que su imagen es el LCP real de esta página, no
 * el `<h1>`. H-79 sigue abierto (el LCP no cumple en ninguna pública);
 * cargarla en diferido empeoraba a propósito la métrica que se está
 * midiendo. Las otras cuatro fotos siguen lazy. Si el día de mañana se
 * reordenan las tarjetas, `priority` tiene que moverse con la que quede
 * primera — no es una propiedad fija de "Quiénes somos", es de la
 * posición.
 */
export default function NosotrosPage() {
  const t = useTranslations('nosotros');

  const tarjetas = [
    {
      href: '/nosotros/quienes-somos',
      titulo: t('tarjetaQuienesSomosTitulo'),
      descripcion: t('tarjetaQuienesSomosDescripcion'),
      imagen: imgQuienesSomos,
      alt: t('tarjetaQuienesSomosAlt'),
    },
    {
      href: '/nosotros/vision-mision-valores',
      titulo: t('tarjetaVisionMisionValoresTitulo'),
      descripcion: t('tarjetaVisionMisionValoresDescripcion'),
      imagen: imgVisionMisionValores,
      alt: t('tarjetaVisionMisionValoresAlt'),
    },
    {
      href: '/nosotros/liderazgo',
      titulo: t('tarjetaLiderazgoTitulo'),
      descripcion: t('tarjetaLiderazgoDescripcion'),
      imagen: imgLiderazgo,
      alt: t('tarjetaLiderazgoAlt'),
    },
    {
      href: '/nosotros/en-que-creemos',
      titulo: t('tarjetaEnQueCreemosTitulo'),
      descripcion: t('tarjetaEnQueCreemosDescripcion'),
      imagen: imgEnQueCreemos,
      alt: t('tarjetaEnQueCreemosAlt'),
    },
    {
      href: '/nosotros/palabra-profetica',
      titulo: t('tarjetaPalabraProfeticaTitulo'),
      descripcion: t('tarjetaPalabraProfeticaDescripcion'),
      imagen: imgPalabraProfetica,
      alt: t('tarjetaPalabraProfeticaAlt'),
    },
    {
      href: '/nosotros/ediciones-vs',
      titulo: t('tarjetaEdicionesVsTitulo'),
      descripcion: t('tarjetaEdicionesVsDescripcion'),
      imagen: null,
      alt: null,
    },
  ];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-16">
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">{t('titulo')}</h1>
        <h2 className="text-xl font-medium">{t('somosFamiliaTitulo')}</h2>
        <p className="text-lg leading-7 text-foreground">{t('somosFamiliaTexto')}</p>
      </div>

      <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {tarjetas.map((tarjeta, index) => (
          <li key={tarjeta.href}>
            <Link
              href={tarjeta.href}
              // ajustes-ux #9: en celular, fila compacta (miniatura a la
              // izquierda, título y descripción a la derecha) — seis tarjetas
              // con foto grande hacían 2 900 px de alto; desde sm, tarjetas.
              className="flex h-full flex-row items-center gap-4 rounded-lg border border-border p-3 transition-colors hover:bg-secondary sm:flex-col sm:items-stretch sm:gap-3 sm:p-4"
            >
              {tarjeta.imagen && tarjeta.alt ? (
                <div className="relative aspect-[4/3] w-28 shrink-0 overflow-hidden rounded-md sm:w-full">
                  {/* H-79: `priority` en la primera tarjeta, el LCP real de
                      esta página — ver el comentario de arriba. `index === 0`
                      y no un flag fijo por tarjeta: si el orden cambia,
                      `priority` se mueve solo con la que quede primera. */}
                  <Image
                    src={tarjeta.imagen}
                    alt={tarjeta.alt}
                    fill
                    sizes={SIZES_TARJETA}
                    priority={index === 0}
                    className="object-cover"
                  />
                </div>
              ) : (
                <div className="w-28 shrink-0 sm:w-full">
                  <PlaceholderImagen aspecto="tarjeta" etiqueta={t('tarjetaImagenAlt', { titulo: tarjeta.titulo })} />
                </div>
              )}
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                {/* ajustes-ux #10: el chevrón dice que la tarjeta se toca, sin depender del hover. */}
                <span className="flex items-center justify-between gap-2 font-medium">
                  {tarjeta.titulo}
                  <ChevronRight aria-hidden className="size-5 shrink-0 text-muted-foreground" />
                </span>
                <span className="text-base text-muted-foreground">{tarjeta.descripcion}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
