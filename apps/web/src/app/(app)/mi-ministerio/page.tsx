import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { ChevronRight, UsersRound } from 'lucide-react';
import { apiFetch, type MinisterioLiderado } from '@vida-sobrenatural/shared-types';
import { EstadoVacio } from '@vida-sobrenatural/ui';
import { auth } from '../../../auth';
import { SelectorMiCamino } from '../mi-camino/selector-mi-camino';

/**
 * spec 016 (D244): "Mi ministerio" del líder, en la web app (como el líder de
 * extensión, D226). La API decide qué Ministerios lidera mirando la base (no
 * el rol del JWT, que puede estar viejo). Con uno solo va derecho a su equipo;
 * con varios, elige. Cargando y error: `loading.tsx` y `error.tsx`.
 */
export default async function MiMinisterioPage() {
  const session = await auth();
  const t = await getTranslations('miMinisterio');
  const ministerios = await apiFetch<MinisterioLiderado[]>('/ministerios/liderados', {
    headers: { Authorization: `Bearer ${session?.apiToken ?? ''}` },
    cache: 'no-store',
  });
  if (ministerios.length === 1) redirect(`/mi-ministerio/${ministerios[0].id}`);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
      <SelectorMiCamino actual="/mi-ministerio" />
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">{t('tituloVarios')}</h1>
        <p className="text-base text-muted-foreground">{t('introVarios')}</p>
      </div>
      {ministerios.length === 0 ? (
        <EstadoVacio mensaje={t('vacio')} />
      ) : (
        <ul className="flex flex-col gap-3">
          {ministerios.map((m) => (
            <li key={m.id}>
              <Link href={`/mi-ministerio/${m.id}`} className="flex min-h-14 items-center justify-between gap-3 rounded-lg border border-border p-4 text-base hover:bg-accent">
                <span className="flex min-w-0 flex-col">
                  <span className="font-semibold break-words">{m.nombre}</span>
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <UsersRound aria-hidden className="size-4 shrink-0" />
                    {t('resumen', { integrantes: m.integrantes, areas: m.areas })}
                  </span>
                </span>
                <ChevronRight aria-hidden className="size-5 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
