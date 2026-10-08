'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Plus, Trash2 } from 'lucide-react';
import { formatearInicioEvento, type EventoResumen, type FiltroEventos } from '@vida-sobrenatural/shared-types';
import { ButtonLink, ControlesTabla, Paginacion, TablaDatos, type ColumnaTabla, type OrdenTabla } from '@vida-sobrenatural/ui';
import { useControlesTablaUrl } from '../../hooks/use-controles-tabla-url';
import { EstadoEventoBadge } from './estado-evento';

const FILTROS: FiltroEventos[] = ['proximos', 'pasados', 'cancelados', 'todos'];

/**
 * spec 011, T029 — isla del listado: controles en la URL (H-88), tabla
 * compartida (H-69) con columnas que se ocultan en celular, una acción
 * principal ("Crear un Evento") y el enlace a la papelera.
 */
export function EventosCliente({
  eventos,
  total,
  pagina,
  totalPaginas,
  filtro,
  tipo,
  orden,
  puedeGestionar,
  puedeAbrirPapelera,
}: {
  eventos: EventoResumen[];
  total: number;
  pagina: number;
  totalPaginas: number;
  filtro: FiltroEventos;
  tipo: string;
  orden: OrdenTabla;
  puedeGestionar: boolean;
  puedeAbrirPapelera: boolean;
}) {
  const t = useTranslations('eventos.gestion');
  const locale = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const controles = useControlesTablaUrl({ clavesAReiniciarConBusqueda: ['pagina'] });

  const columnas: ColumnaTabla<EventoResumen>[] = [
    {
      id: 'nombre',
      encabezado: t('columnas.nombre'),
      ordenable: true,
      celda: (e) => (
        <Link href={`/eventos/${e.id}`} className="font-medium underline underline-offset-2 hover:no-underline">
          {e.nombre}
        </Link>
      ),
    },
    { id: 'fecha', encabezado: t('columnas.fecha'), ordenable: true, celda: (e) => formatearInicioEvento(e.inicio, null, locale), className: 'hidden sm:table-cell' },
    { id: 'tipo', encabezado: t('columnas.tipo'), celda: (e) => t(`tipo.${e.tipo}`), className: 'hidden lg:table-cell' },
    { id: 'estado', encabezado: t('columnas.estado'), celda: (e) => <EstadoEventoBadge estado={e.estado} inicio={e.inicio} /> },
    {
      id: 'ocupacion',
      encabezado: t('columnas.ocupacion'),
      className: 'hidden md:table-cell',
      celda: (e) =>
        !e.requiereInscripcion ? (
          <span className="text-muted-foreground">{t('sinInscripcion')}</span>
        ) : (
          <span className="flex flex-col">
            <span>{e.cupo === null ? t('ocupacionSinCupo', { ocupados: e.ocupados }) : t('ocupacion', { ocupados: e.ocupados, cupo: e.cupo })}</span>
            {e.enEspera > 0 && <span className="text-xs text-muted-foreground">{t('enEspera', { cantidad: e.enEspera })}</span>}
          </span>
        ),
    },
    {
      id: 'pendientes',
      encabezado: t('columnas.pendientes'),
      className: 'hidden xl:table-cell',
      celda: (e) => (
        <span className="flex flex-col">
          <span>{t('pendientesTexto', { cantidad: e.pendientes })}</span>
          {e.pagosAVerificar > 0 && <span className="text-xs text-muted-foreground">{t('pagosTexto', { cantidad: e.pagosAVerificar })}</span>}
        </span>
      ),
    },
  ];

  function ordenar(columna: string) {
    const nueva = columna === 'nombre' ? 'nombre' : 'inicio';
    const actual = orden.columna === 'nombre' ? 'nombre' : 'inicio';
    const dir = nueva === actual ? (orden.direccion === 'asc' ? 'desc' : 'asc') : 'asc';
    controles.actualizarParams({ orden: nueva, dir, pagina: null });
  }

  function hrefPagina(p: number) {
    const params = new URLSearchParams(searchParams);
    if (p <= 1) params.delete('pagina');
    else params.set('pagina', String(p));
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  const hayAlgoAplicado = controles.busqueda !== '' || filtro !== 'proximos' || tipo !== '';

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">{t('titulo')}</h1>
          <p className="text-sm text-muted-foreground">{t('descripcion')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {puedeAbrirPapelera && (
            <ButtonLink variant="ghost" render={<Link href="/eventos/papelera" />}>
              <Trash2 aria-hidden="true" />
              {t('papelera')}
            </ButtonLink>
          )}
          {puedeGestionar && (
            <ButtonLink render={<Link href="/eventos/nuevo" />}>
              <Plus aria-hidden="true" />
              {t('crear')}
            </ButtonLink>
          )}
        </div>
      </div>

      <ControlesTabla
        busqueda={controles.busqueda}
        onBuscarChange={controles.setBusqueda}
        etiquetaBusqueda={t('buscar')}
        placeholderBusqueda={t('buscarPlaceholder')}
        idBusqueda="buscar-eventos"
        hayAlgoAplicado={hayAlgoAplicado}
        onLimpiar={() => controles.limpiar(['filtro', 'tipo', 'pagina'])}
        cantidadResultados={total}
        etiquetaResultados={(cantidad) => t('resultados', { cantidad })}
        filtros={
          <>
            <fieldset className="flex flex-wrap items-center gap-1">
              <legend className="sr-only">{t('filtro.etiqueta')}</legend>
              {FILTROS.map((f) => (
                <button
                  key={f}
                  type="button"
                  aria-pressed={filtro === f}
                  onClick={() => controles.actualizarParams({ filtro: f === 'proximos' ? null : f, pagina: null })}
                  className="h-9 rounded-md border border-input px-3 text-sm aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground"
                >
                  {t(`filtro.${f}`)}
                </button>
              ))}
            </fieldset>
            <label className="flex items-center gap-2 text-sm">
              <span className="sr-only">{t('tipo.etiqueta')}</span>
              <select
                value={tipo}
                onChange={(e) => controles.actualizarParams({ tipo: e.target.value || null, pagina: null })}
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value="">{t('tipo.todos')}</option>
                <option value="general">{t('tipo.general')}</option>
                <option value="bautismo">{t('tipo.bautismo')}</option>
              </select>
            </label>
          </>
        }
      />

      <TablaDatos
        columnas={columnas}
        datos={eventos}
        obtenerId={(e) => e.id}
        etiqueta={t('etiquetaTabla')}
        mensajeVacio={filtro === 'proximos' && !hayAlgoAplicado ? t('vacio.proximos') : t('vacio.otros')}
        accionVacio={
          puedeGestionar && filtro === 'proximos' && !hayAlgoAplicado ? (
            <ButtonLink render={<Link href="/eventos/nuevo" />}>{t('crear')}</ButtonLink>
          ) : undefined
        }
        orden={orden}
        onOrdenar={ordenar}
        encabezadoAcciones={t('columnas.acciones')}
        acciones={(e) => (
          <ButtonLink variant="outline" size="sm" render={<Link href={`/eventos/${e.id}`} />}>
            {t('ver')}
          </ButtonLink>
        )}
      />

      {totalPaginas > 1 && (
        <Paginacion
          paginaActual={pagina}
          totalPaginas={totalPaginas}
          renderEnlace={(p) => <Link href={hrefPagina(p)} />}
          etiquetaNav={t('paginado')}
          etiquetaAnterior={t('anterior')}
          etiquetaSiguiente={t('siguiente')}
        />
      )}
    </div>
  );
}
