import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { CircleAlert, CircleCheck, Clock, UsersRound } from 'lucide-react';
import { apiFetch, formatearDiaEnArgentina, type MiGrupoResumen } from '@vida-sobrenatural/shared-types';
import { EstadoVacio } from '@vida-sobrenatural/ui';
import { requerirPermiso } from '../../../auth';
import { SelectorMiCamino } from '../mi-camino/selector-mi-camino';

/**
 * spec 008, T074 (FR-019, FR-043, D134, D142): Mis grupos del Líder de curso,
 * diseñado a 360 px primero. Por cada edición: inscriptos, quién tiene 2
 * faltas o más, la próxima semana y si falta material (texto + ícono, D81).
 * Sin el permiso vuelve a Mi camino; "cargando" y "error" son loading.tsx y
 * error.tsx; vacío: "Todavía no tenés ediciones a cargo".
 */
export default async function MisGruposPage() {
  const session = await requerirPermiso('mis_grupos.ver');
  const [t, locale] = await Promise.all([getTranslations('misGrupos'), getLocale()]);
  const grupos = await apiFetch<MiGrupoResumen[]>('/vida-de-servicio/mis-grupos', {
    headers: { Authorization: `Bearer ${session.apiToken}` },
    cache: 'no-store',
  });
  const fecha = (iso: string) => formatearDiaEnArgentina(iso, locale);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
      <SelectorMiCamino actual="/mis-grupos" />
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">{t('titulo')}</h1>
        <p className="text-base text-muted-foreground">{t('intro')}</p>
      </div>
      {grupos.length === 0 ? (
        <EstadoVacio mensaje={t('vacio')} />
      ) : (
        <ul className="flex flex-col gap-3">
          {grupos.map((g) => (
            <li key={g.grupoId}>
              <Link
                href={`/mis-grupos/${g.grupoId}`}
                aria-label={t('abrir', { nombre: g.nombre })}
                className="flex flex-col gap-2 rounded-lg border border-border p-4 text-base hover:bg-muted/50"
              >
                <span className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-lg font-semibold text-primary underline underline-offset-2 break-words">{g.nombre}</span>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    {g.estado === 'en_curso' ? <Clock aria-hidden className="size-4" /> : <CircleCheck aria-hidden className="size-4" />}
                    {g.estado === 'en_curso' ? t('enCurso') : t('finalizado')}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <UsersRound aria-hidden className="size-4 shrink-0 text-muted-foreground" />
                  {t('inscriptos', { cantidad: g.inscriptosActivos })}
                </span>
                {g.conAlertaDeFaltas > 0 && (
                  <span className="flex items-center gap-2 font-medium">
                    <CircleAlert aria-hidden className="size-4 shrink-0 text-primary" />
                    {t('conAlerta', { cantidad: g.conAlertaDeFaltas })}
                  </span>
                )}
                {g.proximaSemana && (
                  <span className="text-muted-foreground">
                    {t('proximaSemana', { numero: g.proximaSemana.numero, fecha: fecha(g.proximaSemana.fechaLiberacion) })}{' '}
                    {g.proximaSemana.conMaterial ? t('proximaConMaterial') : t('proximaSinMaterial')}
                  </span>
                )}
                {g.semanasSinMaterialVencidas > 0 && (
                  <span className="flex items-center gap-2 font-medium">
                    <CircleAlert aria-hidden className="size-4 shrink-0 text-primary" />
                    {t('vencidas', { cantidad: g.semanasSinMaterialVencidas })}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
