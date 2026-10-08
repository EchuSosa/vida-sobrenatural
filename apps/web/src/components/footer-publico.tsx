import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Marca } from '@vida-sobrenatural/ui';
import { NAV_PUBLICA } from '../config/nav-publica';
import { IconoFacebook, IconoInstagram } from './iconos-redes';
import { EnlaceContanos } from './enlace-contanos';

/**
 * Pie de página de la web pública — FR-006. Dirección, horarios y redes
 * reales de docs/12-contenido-bienvenida.md / docs/09-notas-identidad-visual.md
 * (H-02/H-09, revisión manual, actualización 2026-09-18) — antes tenía el
 * horario incorrecto ("10 y 18 hs") sin corresponderse con la Sede real, y
 * sin enlaces a las redes reales de la iglesia. Los enlaces de redes llevan
 * ícono y nombre (ajustes-ux #3 deshace la parte "solo ícono" de H-24).
 * spec 013: enlace a "Contanos qué te parece" (FR-045).
 */
export function FooterPublico() {
  const t = useTranslations('nav');
  const tf = useTranslations('footer');
  const tc = useTranslations('comentarios');

  return (
    <footer className="mt-auto border-t border-border">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-8 text-sm text-muted-foreground">
        {/* FR-039 (D122): logotipo del pie de página — H-80: Marca ya se
            defiende del stretch de este flex-col por su cuenta. */}
        <Marca variante="logotipo" className="h-6" />
        <nav aria-label="Pie de página" className="flex flex-wrap gap-x-6">
          {NAV_PUBLICA.map((item) => (
            <Link key={item.href} href={item.href} className="inline-flex min-h-11 items-center hover:text-foreground">
              {t(item.labelKey)}
            </Link>
          ))}
        </nav>
        {/* spec 013 (T064, FR-045): "Contanos qué te parece", con la pantalla de origen. */}
        <EnlaceContanos className="inline-flex min-h-11 items-center self-start text-foreground underline underline-offset-4 hover:no-underline">
          {tc('abrir')}
        </EnlaceContanos>
        <div className="flex flex-col gap-1">
          <p>{tf('direccion')}</p>
          <p>{tf('horarios')}</p>
        </div>
        {/* ajustes-ux #3: área de 44×44 y el nombre visible al lado del
            ícono — no todo el mundo reconoce el glifo de cada red. */}
        <nav aria-label={`${tf('facebook')}, ${tf('instagram')}`} className="flex gap-x-6">
          <a
            href={tf('facebookUrl')}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 min-w-11 items-center gap-2 text-base hover:text-foreground"
          >
            <IconoFacebook className="size-6" />
            {tf('facebook')}
          </a>
          <a
            href={tf('instagramUrl')}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 min-w-11 items-center gap-2 text-base hover:text-foreground"
          >
            <IconoInstagram className="size-6" />
            {tf('instagram')}
          </a>
        </nav>
      </div>
    </footer>
  );
}
