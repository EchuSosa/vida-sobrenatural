import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { PlaceholderImagen } from '@vida-sobrenatural/ui';

export const metadata = {
  title: 'Nosotros — Vida Sobrenatural',
  description: 'Quiénes somos, en qué creemos y nuestro liderazgo.',
};

/**
 * D122/H-77: Nosotros pasa de una página larga a una entrada corta ("Somos
 * Familia") más una grilla de seis tarjetas hacia sus subpáginas — cuatro
 * nuevas (Quiénes somos, Visión/misión/valores, Liderazgo, En qué creemos) y
 * dos que ya existían con su URL sin cambios (Palabra Profética, Ediciones
 * VS, D115). El motivo: reunidas acá, las seis secciones hacían una sola
 * página larguísima de leer y de indexar. Cada tarjeta deja un lugar
 * previsto para una imagen (PlaceholderImagen aspecto="equipo", reutilizado
 * en vez de inventar un aspecto nuevo) aunque hoy no haya ninguna real.
 */
export default function NosotrosPage() {
  const t = useTranslations('nosotros');

  const tarjetas = [
    { href: '/nosotros/quienes-somos', titulo: t('tarjetaQuienesSomosTitulo'), descripcion: t('tarjetaQuienesSomosDescripcion') },
    {
      href: '/nosotros/vision-mision-valores',
      titulo: t('tarjetaVisionMisionValoresTitulo'),
      descripcion: t('tarjetaVisionMisionValoresDescripcion'),
    },
    { href: '/nosotros/liderazgo', titulo: t('tarjetaLiderazgoTitulo'), descripcion: t('tarjetaLiderazgoDescripcion') },
    { href: '/nosotros/en-que-creemos', titulo: t('tarjetaEnQueCreemosTitulo'), descripcion: t('tarjetaEnQueCreemosDescripcion') },
    {
      href: '/nosotros/palabra-profetica',
      titulo: t('tarjetaPalabraProfeticaTitulo'),
      descripcion: t('tarjetaPalabraProfeticaDescripcion'),
    },
    { href: '/nosotros/ediciones-vs', titulo: t('tarjetaEdicionesVsTitulo'), descripcion: t('tarjetaEdicionesVsDescripcion') },
  ];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-16">
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">{t('titulo')}</h1>
        <h2 className="text-xl font-medium">{t('somosFamiliaTitulo')}</h2>
        <p className="text-lg leading-7 text-foreground">{t('somosFamiliaTexto')}</p>
      </div>

      <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {tarjetas.map((tarjeta) => (
          <li key={tarjeta.href}>
            <Link
              href={tarjeta.href}
              className="flex h-full flex-col gap-3 rounded-lg border border-border p-4 transition-colors hover:bg-secondary"
            >
              <PlaceholderImagen aspecto="equipo" etiqueta={t('tarjetaImagenAlt', { titulo: tarjeta.titulo })} />
              <span className="font-medium">{tarjeta.titulo}</span>
              <span className="text-sm text-muted-foreground">{tarjeta.descripcion}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
