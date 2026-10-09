'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { CircleAlert, Plus } from 'lucide-react';
import type { GrupoExtensionResumen } from '@vida-sobrenatural/shared-types';
import { Button, ButtonLink, EstadoActivoBadge, TablaDatos, textoHorario, type ColumnaTabla } from '@vida-sobrenatural/ui';

/** spec 014 (D221): la lista de Grupos de Extensión, con su género calculado, cupo y pedidos esperando (texto + ícono, D81). */
export function GruposExtensionCliente({ grupos, filtro, puedeGestionar }: { grupos: GrupoExtensionResumen[]; filtro: 'activos' | 'todos'; puedeGestionar: boolean }) {
  const t = useTranslations('gruposExtension');
  const router = useRouter();

  const columnas: ColumnaTabla<GrupoExtensionResumen>[] = [
    {
      id: 'nombre',
      encabezado: t('columnaNombre'),
      celda: (g) => (
        <span className="flex flex-col gap-0.5">
          <Link href={`/grupos-extension/${g.id}`} className="font-medium break-words underline underline-offset-4">
            {g.nombre}
          </Link>
          <span className="text-xs text-muted-foreground">{t(`genero.${g.genero ?? 'sinLideres'}`)}</span>
          {g.pendientes > 0 && (
            <span className="flex items-center gap-1 text-xs font-medium">
              <CircleAlert aria-hidden className="size-3.5 text-primary" />
              {t('pendientes', { cantidad: g.pendientes })}
            </span>
          )}
        </span>
      ),
    },
    { id: 'lideres', encabezado: t('columnaLideres'), className: 'hidden sm:table-cell', celda: (g) => g.lideres.join(', ') },
    { id: 'cuando', encabezado: t('columnaCuando'), celda: (g) => textoHorario(g.dias, g.horaInicio, t) },
    {
      id: 'lugar',
      encabezado: t('columnaLugar'),
      className: 'hidden md:table-cell',
      celda: (g) => (
        <span className="flex flex-col gap-0.5">
          <span>{g.enLaIglesia ? t('enLaIglesia') : g.zona}</span>
          {!g.ubicado && <span className="text-xs text-muted-foreground">{t('sinUbicar')}</span>}
        </span>
      ),
    },
    { id: 'integrantes', encabezado: t('columnaIntegrantes'), celda: (g) => (g.cupo === null ? g.integrantes : t('integrantesCupo', { integrantes: g.integrantes, cupo: g.cupo })) },
    ...(filtro === 'todos'
      ? [
          {
            id: 'estado',
            encabezado: t('columnaEstado'),
            celda: (g: GrupoExtensionResumen) => <EstadoActivoBadge activo={g.activo} textoActivo={t('estadoActivo')} textoInactivo={t('estadoInactivo')} />,
          } satisfies ColumnaTabla<GrupoExtensionResumen>,
        ]
      : []),
  ];

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-16">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">{t('titulo')}</h1>
        {puedeGestionar && (
          <ButtonLink render={<Link href="/grupos-extension/nuevo" />} size="sm">
            <Plus aria-hidden />
            {t('crear')}
          </ButtonLink>
        )}
      </div>
      <p className="text-sm text-muted-foreground">{t('intro')}</p>
      {!puedeGestionar && <p className="text-sm text-muted-foreground">{t('soloLectura')}</p>}
      <div className="flex gap-2" role="group" aria-label={t('filtroEstado')}>
        <Button variant={filtro === 'activos' ? 'default' : 'outline'} size="sm" aria-pressed={filtro === 'activos'} onClick={() => router.push('/grupos-extension')}>
          {t('activos')}
        </Button>
        <Button variant={filtro === 'todos' ? 'default' : 'outline'} size="sm" aria-pressed={filtro === 'todos'} onClick={() => router.push('/grupos-extension?estado=todos')}>
          {t('todos')}
        </Button>
      </div>
      <TablaDatos columnas={columnas} datos={grupos} obtenerId={(g) => g.id} etiqueta={t('titulo')} mensajeVacio={filtro === 'activos' ? t('vacioActivos') : t('vacioTodos')} />
    </div>
  );
}
