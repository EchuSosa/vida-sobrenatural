import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { NAV_PUBLICA } from '../config/nav-publica';

/** Pie de página de la web pública — FR-006. */
export function FooterPublico() {
  const t = useTranslations('nav');

  return (
    <footer className="mt-auto border-t border-border">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-8 text-sm text-muted-foreground">
        <nav aria-label="Pie de página" className="flex flex-wrap gap-x-6 gap-y-2">
          {NAV_PUBLICA.map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-foreground">
              {t(item.labelKey)}
            </Link>
          ))}
        </nav>
        <div className="flex flex-col gap-1">
          <p>Calle 23 N°1665 e/ 66 y 67, La Plata, Buenos Aires</p>
          <p>Domingos 10 y 18 hs (presencial y online)</p>
        </div>
      </div>
    </footer>
  );
}
