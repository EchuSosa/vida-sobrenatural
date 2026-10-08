import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { CircleCheck, Clock } from 'lucide-react';
import { apiFetch, formatearDiaEnArgentina, type GrupoEnPerfil, type GruposDePersona } from '@vida-sobrenatural/shared-types';

/**
 * spec 013 (T033, FR-013 b y c, H2.3): los Grupos que cursó y los que tuvo a
 * cargo, separados, del más reciente al más viejo, hasta 20 por lista con el
 * total. Cada uno enlaza a su detalle (`/grupos/[id]`). Nunca las notas de los
 * Encuentros (D134): la API ni las manda.
 */
export async function SeccionGrupos({ personaId, apiToken }: { personaId: string; apiToken: string }) {
  const t = await getTranslations('perfil');
  const grupos = await apiFetch<GruposDePersona>(`/personas/${personaId}/grupos`, { headers: { Authorization: `Bearer ${apiToken}` }, cache: 'no-store' });
  return (
    <>
      <ListaGrupos id="grupos-cursados" titulo={t('secciones.gruposCursados')} items={grupos.cursados} total={grupos.totalCursados} vacio={t('grupos.vacioCursados')} />
      <ListaGrupos id="grupos-a-cargo" titulo={t('secciones.gruposACargo')} items={grupos.aCargo} total={grupos.totalACargo} vacio={t('grupos.vacioACargo')} />
    </>
  );
}

async function ListaGrupos({ id, titulo, items, total, vacio }: { id: string; titulo: string; items: GrupoEnPerfil[]; total: number; vacio: string }) {
  const t = await getTranslations('perfil');
  const locale = await getLocale();
  const fecha = (iso: string) => formatearDiaEnArgentina(iso, locale);
  return (
    <section aria-labelledby={`seccion-${id}`} className="flex flex-col gap-4">
      <h2 id={`seccion-${id}`} className="text-xl font-semibold">
        {titulo}
      </h2>
      {items.length === 0 ? (
        <p className="text-muted-foreground">{vacio}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {items.map((g) => {
            const Icono = g.estadoGrupo === 'en_curso' ? Clock : CircleCheck;
            return (
              <li key={`${id}-${g.grupoId}`} className="flex flex-col gap-1 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <span className="flex flex-col gap-1">
                  <Link href={`/grupos/${g.grupoId}`} className="font-medium underline underline-offset-2" aria-label={t('grupos.verGrupo', { curso: g.curso.nombre })}>
                    {g.curso.nombre}
                  </Link>
                  <span className="text-sm text-muted-foreground">
                    {g.hasta ? t('grupos.desdeHasta', { desde: fecha(g.desde), hasta: fecha(g.hasta) }) : t('grupos.desde', { desde: fecha(g.desde) })}
                  </span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Icono aria-hidden className="size-4 shrink-0" />
                  {g.estadoInscripcion ? t(`grupos.inscripcion.${g.estadoInscripcion}`) : t(g.estadoGrupo === 'en_curso' ? 'grupos.enCurso' : 'grupos.finalizado')}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      {total > items.length && <p className="text-sm text-muted-foreground">{t('grupos.mostrando', { mostrados: items.length, total })}</p>}
    </section>
  );
}
