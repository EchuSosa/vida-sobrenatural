import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import logotipoClaro from '@vida-sobrenatural/ui/assets/marca/logotipo-oscuro-600.png';
import logotipoOscuro from '@vida-sobrenatural/ui/assets/marca/logotipo-blanco-600.png';
import { NAV_PUBLICA } from '../config/nav-publica';
import { IconoFacebook, IconoInstagram } from './iconos-redes';

/**
 * Pie de página de la web pública — FR-006. Dirección, horarios y redes
 * reales de docs/12-contenido-bienvenida.md / docs/09-notas-identidad-visual.md
 * (H-02/H-09, revisión manual, actualización 2026-09-18) — antes tenía el
 * horario incorrecto ("10 y 18 hs") sin corresponderse con la Sede real, y
 * sin enlaces a las redes reales de la iglesia. Los enlaces de redes pasan a
 * ser solo ícono, con aria-label (H-24, actualización 2026-09-20) — antes
 * mostraban el nombre completo escrito.
 */
export function FooterPublico() {
  const t = useTranslations('nav');
  const tf = useTranslations('footer');

  return (
    <footer className="mt-auto border-t border-border">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-8 text-sm text-muted-foreground">
        {/* FR-039 (D122): logotipo del pie de página, claro/oscuro por tema. */}
        <Image src={logotipoClaro} alt="Vida Sobrenatural" className="h-6 w-auto dark:hidden" />
        <Image src={logotipoOscuro} alt="Vida Sobrenatural" className="hidden h-6 w-auto dark:block" />
        <nav aria-label="Pie de página" className="flex flex-wrap gap-x-6 gap-y-2">
          {NAV_PUBLICA.map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-foreground">
              {t(item.labelKey)}
            </Link>
          ))}
        </nav>
        <div className="flex flex-col gap-1">
          <p>{tf('direccion')}</p>
          <p>{tf('horarios')}</p>
        </div>
        <nav aria-label={`${tf('facebook')}, ${tf('instagram')}`} className="flex gap-x-4">
          <a
            href="https://facebook.com/iglesia.vida.sobrenatural"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={tf('facebook')}
            className="hover:text-foreground"
          >
            <IconoFacebook className="size-5" />
          </a>
          <a
            href="https://instagram.com/iglesiavs"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={tf('instagram')}
            className="hover:text-foreground"
          >
            <IconoInstagram className="size-5" />
          </a>
        </nav>
      </div>
    </footer>
  );
}
