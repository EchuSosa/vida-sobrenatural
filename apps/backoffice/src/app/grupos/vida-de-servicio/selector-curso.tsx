import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

/**
 * spec 008, T019 (FR-038): el filtro por curso del listado de Grupos — en la
 * URL (`?curso=`), Vida Nueva por defecto para no cambiar la vista de la 004.
 * Enlaces de verdad con el actual marcado con `aria-current` + subrayado (no
 * solo color, D81).
 */
export async function SelectorCurso({ actual }: { actual: 'vida_nueva' | 'vida_de_servicio' }) {
  const t = await getTranslations('edicionesServicio');
  const items = [
    { curso: 'vida_nueva', href: '/grupos', texto: t('vidaNueva') },
    { curso: 'vida_de_servicio', href: '/grupos?curso=vida_de_servicio', texto: t('vidaDeServicio') },
  ] as const;
  return (
    <nav aria-label={t('curso')} className="mx-auto w-full max-w-5xl px-4 pt-8">
      <ul className="flex flex-wrap gap-1">
        {items.map((i) => (
          <li key={i.curso}>
            <Link
              href={i.href}
              aria-current={i.curso === actual ? 'page' : undefined}
              className="flex min-h-11 items-center rounded-md px-3 text-muted-foreground hover:text-foreground aria-[current=page]:font-semibold aria-[current=page]:text-foreground aria-[current=page]:underline aria-[current=page]:decoration-2 aria-[current=page]:underline-offset-8"
            >
              {i.texto}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
