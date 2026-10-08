import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { auth, tienePermisoSesion } from '../../../auth';
import { SUBNAV_MI_CAMINO } from '../../../config/nav-app';

/**
 * spec 006, T058 (FR-023, D156): "Mi camino · Mis discipulados" arriba de Mi
 * camino, Mis discipulados y Mi disponibilidad. Enlaces de verdad, en un
 * `<nav>` con nombre; el actual se marca con `aria-current`, subrayado y peso
 * (no solo color, D81); objetivos de 44 px (D150). Si la sesión ve un solo
 * ítem, no se muestra (un selector de una opción es ruido).
 */
export async function SelectorMiCamino({ actual }: { actual: string }) {
  const session = await auth();
  if (!session) return null;
  const t = await getTranslations('miCamino.selector');
  const items = SUBNAV_MI_CAMINO.filter((i) => i.permiso === 'cualquier-sesion' || tienePermisoSesion(session, i.permiso));
  if (items.length < 2) return null;

  return (
    <nav aria-label={t('etiqueta')} className="-mx-1 overflow-x-auto">
      <ul className="flex gap-1">
        {items.map((item) => {
          const esActual = item.href === actual;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={esActual ? 'page' : undefined}
                className="flex min-h-11 items-center rounded-md px-3 text-base text-muted-foreground hover:text-foreground aria-[current=page]:font-semibold aria-[current=page]:text-foreground aria-[current=page]:underline aria-[current=page]:decoration-2 aria-[current=page]:underline-offset-8"
              >
                {t(item.labelKey)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
