import Image from 'next/image';
import Link from 'next/link';
import { Suspense } from 'react';
import { useTranslations } from 'next-intl';
import { ButtonLink, HeroConFoto } from '@vida-sobrenatural/ui';
import { AvisoPorQuery } from '../../components/aviso-por-query';
import imgHero from '@/assets/images/hero/hero-culto-congregacion.webp';
import imgCardPrimerosPasos from '@/assets/images/cards/card-bienvenida-estas-en-casa.webp';
import imgCardNosotros from '@/assets/images/cards/card-comunidad-pareja-mayor.webp';
import imgCardEventos from '@/assets/images/cards/card-jovenes-manos.webp';
import imgCardVisitanos from '@/assets/images/cards/card-culto-manos.webp';

export const metadata = {
  title: 'Vida Sobrenatural — La Plata',
  description:
    'Iglesia Vida Sobrenatural en La Plata, Buenos Aires. Enterate cómo son los primeros pasos y visitanos.',
};

// docs/claude_20-fotos-web-publica.md: mismo tamaño que la grilla de dos
// columnas (sm+) / una columna (celular) que usa /nosotros para sus
// tarjetas.
const SIZES_TARJETA = '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw';
// El héroe ocupa el ancho del contenedor (max-w-3xl = 48rem), nunca el
// viewport completo — no es edge-to-edge.
const SIZES_HERO = '(min-width: 768px) 768px, 100vw';

/**
 * Lote de fotos reales (docs/claude_20-fotos-web-publica.md, sección
 * "Inicio"): esta página pasa de h1+párrafo+dos botones sueltos a un héroe
 * con foto (`hero/hero-culto-congregacion`, 16:9, R2) + cuatro tarjetas de
 * navegación (`cards/`, 4:3) — estructura nueva, aprobada a propósito para
 * esta página (R5 del prompt de este lote: la única excepción — el resto
 * de las páginas de este lote NO arman secciones que no tenían).
 *
 * Contenedor ensanchado de `max-w-2xl` a `max-w-3xl` (mismo ancho que
 * /nosotros) — lo pide la grilla de 2×2 de las cuatro tarjetas nuevas, no
 * un cambio de texto (A1 del prompt: "si el layout lo exige, decime qué
 * cambiaste y por qué" — esto es lo que cambié, y por qué).
 *
 * `priority` va en el HÉROE, no en ninguna tarjeta — es la propiedad de la
 * POSICIÓN (LCP real de esta página), no de un componente fijo, mismo
 * criterio que H-79 en nosotros/page.tsx (ahí, la primera TARJETA es el
 * LCP porque esa página no tiene héroe). Las cuatro tarjetas quedan lazy.
 * Verificado con el build de producción, no con `next dev` — ver el
 * reporte de la conversación.
 *
 * `hero/hero-multitud-bn` (el documento lo anota como "héroe alternativo
 * — A/B o modo oscuro") NO se usa acá: no hay A/B testing ni una decisión
 * de foto distinta por tema en esta app. Queda sin usar a propósito.
 *
 * `cards/card-culto-manos` (tarjeta Visitanos, acá) es la MISMA foto que
 * la cabecera de /visitanos — a propósito (la tarjeta anticipa la
 * página), documentado en las dos páginas.
 */
export default function InicioPage() {
  const t = useTranslations('inicio');

  const tarjetas = [
    {
      href: '/primeros-pasos',
      titulo: t('tarjetaPrimerosPasosTitulo'),
      descripcion: t('tarjetaPrimerosPasosDescripcion'),
      imagen: imgCardPrimerosPasos,
      alt: t('tarjetaPrimerosPasosAlt'),
    },
    {
      href: '/nosotros',
      titulo: t('tarjetaNosotrosTitulo'),
      descripcion: t('tarjetaNosotrosDescripcion'),
      imagen: imgCardNosotros,
      alt: t('tarjetaNosotrosAlt'),
    },
    {
      href: '/eventos',
      titulo: t('tarjetaEventosTitulo'),
      descripcion: t('tarjetaEventosDescripcion'),
      imagen: imgCardEventos,
      alt: t('tarjetaEventosAlt'),
    },
    {
      href: '/visitanos',
      titulo: t('tarjetaVisitanosTitulo'),
      descripcion: t('tarjetaVisitanosDescripcion'),
      imagen: imgCardVisitanos,
      alt: t('tarjetaVisitanosAlt'),
    },
  ];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-16">
      {/* H-11: aviso breve al volver acá después de cerrar sesión — no
          renderiza nada visible (un toast, fuera del flujo del documento),
          así que su posición acá no afecta el layout de abajo. */}
      <Suspense fallback={null}>
        <AvisoPorQuery param="sesion" valor="cerrada" mensaje="Cerraste sesión." />
      </Suspense>

      <HeroConFoto
        className="aspect-video"
        foto={<Image src={imgHero} alt={t('heroAlt')} fill sizes={SIZES_HERO} priority className="object-cover" />}
      >
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Vida Sobrenatural — La Plata</h1>
        <p className="text-lg leading-7">
          Nos alegra que estés acá. Si te acercaste por primera vez, o hace poco empezaste a venir,
          arrancá por Primeros pasos.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <ButtonLink render={<Link href="/primeros-pasos" />} size="xl">
            Ver primeros pasos
          </ButtonLink>
          {/* La variante "outline" está pensada para el fondo normal de la
              página (hereda text-foreground, borde/fondo de tema) — acá
              adentro del velo eso queda mal en los dos sentidos: sin
              override de texto, hereda blanco (--velo-heroe-texto) sobre
              un bg-background casi blanco (invisible); y su borde/fondo
              propios (border-border, dark:border-input) casi no se
              distinguen del velo oscuro en modo oscuro (encontrado
              probando esto, no a ojo). Mismo criterio que el resto del
              velo: colores fijos de --velo-heroe-texto, NO de tema — es
              una foto, no una superficie de UI que cambia con el modo. */}
          <ButtonLink
            render={<Link href="/visitanos" />}
            variant="outline"
            size="xl"
            className="border-velo-heroe-texto/60 bg-velo-heroe-texto/10 text-velo-heroe-texto hover:bg-velo-heroe-texto/20 hover:text-velo-heroe-texto dark:border-velo-heroe-texto/60 dark:bg-velo-heroe-texto/10 dark:hover:bg-velo-heroe-texto/20"
          >
            Visitanos
          </ButtonLink>
        </div>
      </HeroConFoto>

      <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {tarjetas.map((tarjeta) => (
          <li key={tarjeta.href}>
            <Link
              href={tarjeta.href}
              className="flex h-full flex-col gap-3 rounded-lg border border-border p-4 transition-colors hover:bg-secondary"
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-md">
                <Image src={tarjeta.imagen} alt={tarjeta.alt} fill sizes={SIZES_TARJETA} className="object-cover" />
              </div>
              <span className="font-medium">{tarjeta.titulo}</span>
              <span className="text-sm text-muted-foreground">{tarjeta.descripcion}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
