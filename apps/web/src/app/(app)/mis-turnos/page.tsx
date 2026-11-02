import { getLocale, getTranslations } from 'next-intl/server';
import { CalendarCheck } from 'lucide-react';
import { apiFetch, formatearDiaDeServicio, lugarDelTurno, type MiTurno } from '@vida-sobrenatural/shared-types';
import { auth } from '../../../auth';

/** spec 017, US3: los turnos publicados y futuros de la persona. Vacío: lo dice; error: `error.tsx`. */
export default async function MisTurnosPage() {
  const session = await auth();
  const [t, locale] = await Promise.all([getTranslations('misTurnos'), getLocale()]);
  const turnos = await apiFetch<MiTurno[]>('/turnos/me', { headers: { Authorization: `Bearer ${session?.apiToken ?? ''}` }, cache: 'no-store' });
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">{t('titulo')}</h1>
        <p className="text-base text-muted-foreground">{t('intro')}</p>
      </div>
      {turnos.length === 0 ? (
        <p className="rounded-lg border border-border p-5 text-base text-muted-foreground">{t('vacio')}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {turnos.map((turno) => (
            <li key={turno.id} className="flex gap-3 rounded-lg border border-border p-4">
              <CalendarCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
              <div className="flex min-w-0 flex-col gap-1">
                <span className="font-medium first-letter:uppercase">{formatearDiaDeServicio(turno.dia, locale)}</span>
                <span className="break-words">{lugarDelTurno(turno.ministerio.nombre, turno.area)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
