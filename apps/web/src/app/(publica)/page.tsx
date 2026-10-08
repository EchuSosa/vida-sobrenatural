import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Suspense } from 'react';
import { useTranslations } from 'next-intl';
import { ButtonLink, HeroConFoto, HeroConFotoBoton } from '@vida-sobrenatural/ui';
import { AvisoPorQuery } from '../../components/aviso-por-query';
import { FOTOS_HEROE } from '@/assets/images/fotos-heroe';
import imgCardPrimerosPasos from '@/assets/images/cards/card-bienvenida-estas-en-casa.webp';
import imgCardNosotros from '@/assets/images/cards/card-comunidad-pareja-mayor.webp';
import { ProximosEventos } from '../../components/eventos/proximos-eventos';
import imgCardVisitanos from '@/assets/images/cards/card-culto-manos.webp';

export const metadata = {
  title: 'Vida Sobrenatural — La Plata',
  description:
    'Iglesia Vida Sobrenatural en La Plata, Buenos Aires. Enterate cómo son los primeros pasos y visitanos.',
};

// Tres tarjetas en fila desde sm (como "Próximos eventos", debajo), una
// columna en celular.
const SIZES_TARJETA = '(min-width: 768px) 240px, (min-width: 640px) 33vw, 100vw';
// El héroe ocupa el ancho del contenedor (max-w-3xl = 48rem), nunca el
// viewport completo — no es edge-to-edge.
const SIZES_HERO = '(min-width: 768px) 768px, 100vw';

/**
 * Lote de fotos reales (docs/claude_20-fotos-web-publica.md, sección
 * "Inicio"): esta página pasa de h1+párrafo+dos botones sueltos a un héroe
 * con foto (`hero/hero-culto-congregacion`, 16:9, R2) + tres tarjetas de
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
 * H-123: la foto del héroe sale de `FOTOS_HEROE` (@/assets/images/
 * fotos-heroe.ts), no de un import directo — es el registro único del que
 * también lee scripts/chequear-contraste-velo.mjs para saber contra qué
 * fotos medir el velo.
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
        foto={<Image src={FOTOS_HEROE.inicio} alt={t('heroAlt')} fill sizes={SIZES_HERO} priority className="object-cover" />}
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
          {/* H-123: pieza propia (HeroConFotoBoton, packages/ui) en vez
              del override de seis clases que estaba antes acá — la
              próxima cabecera con botón la reusa, no se olvida de
              ninguna de las seis. */}
          <HeroConFotoBoton render={<Link href="/visitanos" />} size="xl">
            Visitanos
          </HeroConFotoBoton>
        </div>
      </HeroConFoto>

      {/* ajustes-ux: sin la tarjeta estática "Eventos" — la sección
          "Próximos eventos" de abajo la reemplaza (FR-001 de la 011). En
          celular la foto va en 16:9 para que la página no se haga eterna
          (#8), y la descripción en 16 px (#7, D150). */}
      <ul className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        {tarjetas.map((tarjeta) => (
          <li key={tarjeta.href}>
            <Link
              href={tarjeta.href}
              className="flex h-full flex-col gap-3 rounded-lg border border-border p-4 transition-colors hover:bg-secondary"
            >
              <div className="relative aspect-video w-full overflow-hidden rounded-md sm:aspect-[4/3]">
                <Image src={tarjeta.imagen} alt={tarjeta.alt} fill sizes={SIZES_TARJETA} className="object-cover" />
              </div>
              {/* ajustes-ux #10: chevrón para que se entienda que se toca. */}
              <span className="flex items-center justify-between gap-2 font-medium">
                {tarjeta.titulo}
                <ChevronRight aria-hidden className="size-5 shrink-0 text-muted-foreground" />
              </span>
              <span className="text-base text-muted-foreground">{tarjeta.descripcion}</span>
            </Link>
          </li>
        ))}
      </ul>

      {/* spec 011, FR-001: los próximos tres Eventos. */}
      <ProximosEventos />
    </div>
  );
}
