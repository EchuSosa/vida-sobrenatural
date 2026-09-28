'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowRightLeft, CircleCheckBig, Clock, UserRoundX } from 'lucide-react';
import type { DiscipuladoResumen, Pagina } from '@vida-sobrenatural/shared-types';
import { Button, Paginacion, TablaDatos, type ColumnaTabla, type OrdenTabla } from '@vida-sobrenatural/ui';
import { useControlesTablaUrl } from '../../hooks/use-controles-tabla-url';
import { fechaParaLeer, nombresDe } from '../mis-discipulados/comun';
import { FILTROS_PENDIENTE, type FiltroPendiente } from './constantes';

/**
 * specs/004, T047: el listado de discipulados. Isla de cliente solo para los
 * filtros y el orden en la URL (H-88); los datos llegan de page.tsx. Lo que
 * tiene pendiente cada uno va con texto e ícono (D81). En celular quedan las
 * Personas, lo pendiente y "Ver"; lo demás está en el detalle (docs/15).
 */
export function GruposCliente({
  pagina,
  paginaActual,
  totalPaginas,
  estado,
  pendiente,
  orden,
}: {
  pagina: Pagina<DiscipuladoResumen>;
  paginaActual: number;
  totalPaginas: number;
  estado: 'en_curso' | 'finalizado';
  pendiente: FiltroPendiente | null;
  orden: OrdenTabla;
}) {
  const t = useTranslations('grupos');
  const locale = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { actualizarParams } = useControlesTablaUrl();

  function hrefPagina(n: number): string {
    const params = new URLSearchParams(searchParams);
    if (n <= 1) params.delete('pagina');
    else params.set('pagina', String(n));
    const q = params.toString();
    return q ? `${pathname}?${q}` : pathname;
  }

  const columnas: ColumnaTabla<DiscipuladoResumen>[] = [
    {
      id: 'personas',
      encabezado: t('tabla.personas'),
      celda: (d) => <span className="font-medium">{nombresDe(d.personas.filter((p) => estado === 'finalizado' || p.estadoInscripcion === 'activa'))}</span>,
    },
    {
      id: 'discipulador',
      encabezado: t('tabla.discipulador'),
      className: 'hidden sm:table-cell',
      celda: (d) => `${d.discipulador.nombre} ${d.discipulador.apellido}`,
    },
    {
      id: 'desde',
      encabezado: t('tabla.desde'),
      ordenable: true,
      className: 'hidden md:table-cell',
      celda: (d) => fechaParaLeer(d.desde, locale),
    },
    {
      id: 'lugar',
      encabezado: t('tabla.lugar'),
      className: 'hidden lg:table-cell',
      celda: (d) => t('lugar', d.lugar),
    },
    {
      id: 'encuentros',
      encabezado: t('tabla.encuentros'),
      className: 'hidden lg:table-cell',
      celda: (d) => d.cantidadEncuentros,
    },
    {
      id: 'ultimoCapitulo',
      encabezado: t('tabla.ultimoCapitulo'),
      className: 'hidden xl:table-cell',
      celda: (d) => d.ultimoEncuentro?.capitulos ?? t('tabla.sinEncuentros'),
    },
    {
      id: 'pendiente',
      encabezado: estado === 'finalizado' ? t('filtros.estado') : t('tabla.pendiente'),
      celda: (d) => (estado === 'finalizado' ? <EstadoCierre d={d} /> : <Pendientes d={d} />),
    },
  ];

  const mensajeVacio = pendiente ? t('tabla.vacioFiltro') : estado === 'finalizado' ? t('tabla.vacioFinalizados') : t('tabla.vacio');

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">{t('titulo')}</h1>
        <p className="text-muted-foreground">{t('descripcion')}</p>
      </header>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t('filtros.estado')}>
          <span className="text-sm font-medium">{t('filtros.estado')}:</span>
          <Button size="lg" variant={estado === 'en_curso' ? 'default' : 'outline'} aria-pressed={estado === 'en_curso'} onClick={() => actualizarParams({ estado: null, pendiente: null, pagina: null })}>
            {t('filtros.enCurso')}
          </Button>
          <Button size="lg" variant={estado === 'finalizado' ? 'default' : 'outline'} aria-pressed={estado === 'finalizado'} onClick={() => actualizarParams({ estado: 'finalizado', pendiente: null, pagina: null })}>
            {t('filtros.finalizados')}
          </Button>
        </div>
        {estado === 'en_curso' && (
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t('filtros.pendiente')}>
            <span className="text-sm font-medium">{t('filtros.pendiente')}:</span>
            <Button size="lg" variant={pendiente === null ? 'default' : 'outline'} aria-pressed={pendiente === null} onClick={() => actualizarParams({ pendiente: null, pagina: null })}>
              {t('filtros.todos')}
            </Button>
            {FILTROS_PENDIENTE.map((f) => (
              <Button key={f} size="lg" variant={pendiente === f ? 'default' : 'outline'} aria-pressed={pendiente === f} onClick={() => actualizarParams({ pendiente: f, pagina: null })}>
                {t(`filtros.${f}`)}
              </Button>
            ))}
          </div>
        )}
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {t('tabla.resultados', { cantidad: pagina.total })}
        </p>
      </div>

      <TablaDatos
        columnas={columnas}
        datos={pagina.items}
        obtenerId={(d) => d.grupoId}
        etiqueta={t('tabla.etiqueta')}
        mensajeVacio={mensajeVacio}
        orden={orden}
        onOrdenar={() => actualizarParams({ dir: orden.direccion === 'desc' ? 'asc' : null, pagina: null })}
        encabezadoAcciones={t('tabla.acciones')}
        acciones={(d) => (
          <Link
            href={`/grupos/${d.grupoId}`}
            className="inline-flex min-h-11 items-center underline underline-offset-4"
            aria-label={t('tabla.verDe', { nombres: nombresDe(d.personas) })}
          >
            {t('tabla.ver')}
          </Link>
        )}
      />

      <Paginacion paginaActual={paginaActual} totalPaginas={totalPaginas} renderEnlace={(p) => <Link href={hrefPagina(p)} />} etiquetaNav={t('tabla.paginado')} />
    </div>
  );
}

function Pendientes({ d }: { d: DiscipuladoResumen }) {
  const t = useTranslations('grupos');
  const bajas = d.personas.filter((p) => p.bajaPropuesta).length;
  const items: Array<{ clave: string; icono: React.ReactNode; texto: string }> = [];
  if (d.propuestaFinalizacionEn) items.push({ clave: 'fin', icono: <CircleCheckBig className="size-4 shrink-0" aria-hidden="true" />, texto: t('pendientes.finalizacion') });
  if (bajas > 0) items.push({ clave: 'baja', icono: <UserRoundX className="size-4 shrink-0" aria-hidden="true" />, texto: t('pendientes.baja', { cantidad: bajas }) });
  if (d.reasignacionPropuesta) {
    items.push({
      clave: 'reasig',
      icono: <ArrowRightLeft className="size-4 shrink-0" aria-hidden="true" />,
      texto: t('pendientes.reasignacion', { nombre: `${d.reasignacionPropuesta.discipulador.nombre} ${d.reasignacionPropuesta.discipulador.apellido}` }),
    });
  }
  if (items.length === 0) return <span className="text-muted-foreground">{t('tabla.nadaPendiente')}</span>;
  return (
    <ul className="flex flex-col gap-1">
      {items.map((i) => (
        <li key={i.clave} className="flex items-center gap-1.5">
          {i.icono}
          {i.texto}
        </li>
      ))}
    </ul>
  );
}

function EstadoCierre({ d }: { d: DiscipuladoResumen }) {
  const t = useTranslations('grupos');
  return (
    <span className="inline-flex items-center gap-1.5">
      {d.motivoCierre === 'completado' ? <CircleCheckBig className="size-4" aria-hidden="true" /> : <Clock className="size-4" aria-hidden="true" />}
      {t(`estado.${d.motivoCierre ?? 'en_curso'}`)}
    </span>
  );
}
