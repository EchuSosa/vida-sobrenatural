import { getTranslations } from 'next-intl/server';
import { Lock } from 'lucide-react';
import type { ResumenPreguntaEvento } from '@vida-sobrenatural/shared-types';

/**
 * spec 011, ampliación 2026-10-09 (FR-067, FR-068) — arriba de la lista de
 * inscriptos, el resumen por pregunta ("¿Sos celíaca? Sí: 3 · No: 25"). Las
 * sensibles llegan solo para quien tiene `eventos.gestionar` (lo filtra la
 * API) y se marcan con texto + ícono (D81). `null` = no se pudo cargar.
 */
export async function ResumenPreguntas({ resumen }: { resumen: ResumenPreguntaEvento[] | null }) {
  const t = await getTranslations('eventos.inscriptos');
  if (resumen === null) {
    return (
      <p role="alert" className="rounded-md border border-destructive bg-destructive/10 px-3 py-2 text-sm">
        {t('errorResumen')}
      </p>
    );
  }
  if (resumen.length === 0) return null;
  const valor = (r: ResumenPreguntaEvento, v: string) => (r.tipo === 'si_no' ? t(v === 'si' ? 'si' : 'no') : v);
  return (
    <section aria-labelledby="titulo-resumen-preguntas" className="flex flex-col gap-2 rounded-md border border-border p-4" data-testid="resumen-preguntas">
      <h3 id="titulo-resumen-preguntas" className="text-base font-semibold">
        {t('resumenPreguntas')}
      </h3>
      <p className="text-sm text-muted-foreground">{t('resumenPreguntasAyuda')}</p>
      <ul className="flex flex-col gap-2 text-sm">
        {resumen.map((r) => (
          <li key={r.preguntaId} className="flex flex-col gap-0.5">
            <span className="flex flex-wrap items-center gap-x-2 font-medium">
              {r.texto}
              {r.sensible && (
                <span className="inline-flex items-center gap-1 text-xs font-normal text-muted-foreground">
                  <Lock aria-hidden="true" className="size-3.5" />
                  {t('sensible')}
                </span>
              )}
            </span>
            <span>
              {r.tipo === 'texto'
                ? t('respondieron', { cantidad: r.respondidas })
                : r.conteos.map((c) => `${valor(r, c.valor)}: ${c.cantidad}`).join(' · ')}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
