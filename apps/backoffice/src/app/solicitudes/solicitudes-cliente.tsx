'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { ESTADOS_POR_TIPO, formatearFechaHora, type Pagina, type PersonaBreve, type SolicitudBandeja, type TipoSolicitud } from '@vida-sobrenatural/shared-types';
import { AvatarPersona, ButtonLink, ControlesTabla, Paginacion, TablaDatos, type ColumnaTabla } from '@vida-sobrenatural/ui';
import { useControlesTablaUrl } from '../../hooks/use-controles-tabla-url';
import { PedirEnNombreDe } from '../../components/pedir-en-nombre-de';
import { EnlacePersona } from '../../components/enlace-persona';
import { RUTA_DETALLE_SOLICITUD } from '../../config/solicitudes';
import { EstadoBandeja, TipoTexto } from './estado-solicitud-texto';
import { diasDesde, type VistaBandeja } from './constantes';

const CLASE_SELECT = 'h-10 rounded-md border border-input bg-transparent px-2 text-sm font-normal dark:bg-input/30';

/**
 * spec 013, T024: la bandeja unificada. Los datos llegan de page.tsx (Server
 * Component); acá solo la sincronización de filtros, búsqueda, orden y página
 * con la URL (H-88, H-101). Cambiar un filtro vuelve a la página 1.
 *
 * Filtros (FR-004): "Mostrar" (Abiertas / Resueltas / Todas y, con un tipo
 * elegido, sus estados) y "Tipo" (solo con más de un tipo conectado: un
 * filtro de una sola opción es ruido). Celular (`docs/15`): Persona, Estado y
 * la acción nunca se ocultan; el tipo y la espera se repiten dentro de esas
 * celdas cuando sus columnas se van.
 *
 * Sin acciones de resolver propias (FR-006): cada fila lleva al detalle de su
 * tipo, donde se resuelve. "Pedir Vida Nueva en nombre de…" es de la 004.
 */
export function SolicitudesCliente({
  pagina,
  paginaActual,
  totalPaginas,
  vista,
  conectados,
  apiToken,
  puedeCrearEnNombre,
}: {
  pagina: Pagina<SolicitudBandeja>;
  paginaActual: number;
  totalPaginas: number;
  vista: VistaBandeja;
  conectados: TipoSolicitud[];
  apiToken: string;
  puedeCrearEnNombre: boolean;
}) {
  const t = useTranslations('bandeja');
  const tEstados = useTranslations('bandeja.estados');
  const tTipos = useTranslations('bandeja.tipos');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { busqueda, setBusqueda, actualizarParams, limpiar } = useControlesTablaUrl({ clavesAReiniciarConBusqueda: ['pagina'] });
  const variosTipos = conectados.length > 1;

  function hrefPagina(numero: number): string {
    const params = new URLSearchParams(searchParams);
    if (numero <= 1) params.delete('pagina');
    else params.set('pagina', String(numero));
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  function hrefSin(claves: string[]): string {
    const params = new URLSearchParams(searchParams);
    for (const clave of claves) params.delete(clave);
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  const nombre = (p: PersonaBreve) => `${p.nombre} ${p.apellido}`;
  const espera = (s: SolicitudBandeja) => (s.abierta ? t('espera', { dias: diasDesde(s.esperaDesde) }) : t('esperaResuelta'));

  const columnas: ColumnaTabla<SolicitudBandeja>[] = [
    ...(variosTipos
      ? [{ id: 'tipo', encabezado: t('columnas.tipo'), className: 'hidden sm:table-cell', celda: (s: SolicitudBandeja) => <TipoTexto tipo={s.tipo} /> }]
      : []),
    {
      id: 'persona',
      encabezado: t('columnas.persona'),
      ordenable: true,
      celda: (s) => (
        <span className="flex items-start gap-2">
          <AvatarPersona nombre={s.persona.nombre} apellido={s.persona.apellido} fotoUrl={s.persona.fotoUrl} tamanio="sm" className="max-sm:hidden" />
          <span className="flex flex-col gap-0.5">
          {/* FR-006: el nombre lleva al perfil; "Ver", al detalle de la Solicitud. */}
          <EnlacePersona persona={s.persona} className="font-medium" />
          {variosTipos && (
            <span className="text-muted-foreground sm:hidden">
              <TipoTexto tipo={s.tipo} />
            </span>
          )}
          </span>
        </span>
      ),
    },
    {
      id: 'estado',
      encabezado: t('columnas.estado'),
      celda: (s) => (
        <span className="flex flex-col gap-0.5">
          <EstadoBandeja solicitud={s} />
          {s.abierta && <span className="text-muted-foreground sm:hidden">{espera(s)}</span>}
        </span>
      ),
    },
    { id: 'espera', encabezado: t('columnas.espera'), ordenable: true, className: 'hidden sm:table-cell', celda: espera },
    {
      id: 'fecha',
      encabezado: t('columnas.pedida'),
      ordenable: true,
      className: 'hidden md:table-cell',
      celda: (s) => formatearFechaHora(s.createdAt, locale),
    },
    {
      id: 'cargadaPor',
      encabezado: t('columnas.cargadaPor'),
      className: 'hidden lg:table-cell',
      celda: (s) => (s.creadoPor ? nombre(s.creadoPor) : t('laPersona')),
    },
    {
      id: 'revisadaPor',
      encabezado: t('columnas.revisadaPor'),
      className: 'hidden lg:table-cell',
      celda: (s) =>
        s.revisadoPor
          ? s.revisadaEn
            ? t('revisadaPorEl', { nombre: nombre(s.revisadoPor), fecha: formatearFechaHora(s.revisadaEn, locale) })
            : nombre(s.revisadoPor)
          : t('sinDato'),
    },
  ];

  const valorMostrar = vista.estado ? `estado:${vista.estado}` : vista.filtro;
  const hayAlgoAplicado =
    busqueda.trim() !== '' || vista.filtro !== 'abiertas' || vista.estado !== null || (variosTipos && vista.tipo !== null) || vista.persona !== null;
  const mensajeVacio = busqueda.trim()
    ? t('vacioBusqueda', { q: busqueda.trim() })
    : vista.filtro === 'abiertas' && !vista.estado
      ? t('vacioAbiertas')
      : t('vacioFiltro');
  const personaFiltrada = vista.persona ? pagina.items.find((s) => s.persona.id === vista.persona)?.persona : undefined;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-16">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">{t('titulo')}</h1>
        <p className="text-muted-foreground">{t('descripcion')}</p>
      </div>

      {puedeCrearEnNombre && <PedirEnNombreDe apiToken={apiToken} onCreado={() => router.refresh()} />}

      {vista.persona && (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span>{personaFiltrada ? t('soloDe', { nombre: nombre(personaFiltrada) }) : t('soloDeUnaPersona')}</span>
          <Link href={hrefSin(['persona', 'pagina'])} className="font-medium underline underline-offset-2">
            {t('verDeTodos')}
          </Link>
        </p>
      )}

      <ControlesTabla
        busqueda={busqueda}
        onBuscarChange={setBusqueda}
        etiquetaBusqueda={t('buscar')}
        placeholderBusqueda={t('buscarPlaceholder')}
        filtros={
          <>
            <label className="flex flex-col gap-1 text-sm font-medium">
              {t('mostrar')}
              <select
                value={valorMostrar}
                onChange={(e) => {
                  const valor = e.target.value;
                  if (valor.startsWith('estado:')) actualizarParams({ estado: valor.slice('estado:'.length), filtro: null, pagina: null });
                  else actualizarParams({ filtro: valor === 'abiertas' ? null : valor, estado: null, pagina: null });
                }}
                className={CLASE_SELECT}
              >
                {(['abiertas', 'resueltas', 'todas'] as const).map((f) => (
                  <option key={f} value={f}>
                    {t(`filtros.${f}`)}
                  </option>
                ))}
                {vista.tipo && (
                  <optgroup label={t('porEstado')}>
                    {ESTADOS_POR_TIPO[vista.tipo].map((estado) => (
                      <option key={estado} value={`estado:${estado}`}>
                        {tEstados(`${vista.tipo}.${estado}` as `${TipoSolicitud}.pendiente`)}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </label>
            {variosTipos && (
              <label className="flex flex-col gap-1 text-sm font-medium">
                {t('filtroTipo')}
                <select
                  value={vista.tipo ?? ''}
                  // Los estados son de cada tipo: cambiar de tipo los suelta.
                  onChange={(e) => actualizarParams({ tipo: e.target.value || null, estado: null, pagina: null })}
                  className={CLASE_SELECT}
                >
                  <option value="">{t('todosLosTipos')}</option>
                  {conectados.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {tTipos(tipo)}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </>
        }
        hayAlgoAplicado={hayAlgoAplicado}
        onLimpiar={() => limpiar(['filtro', 'estado', 'tipo', 'persona', 'pagina'])}
        cantidadResultados={pagina.total}
        etiquetaResultados={(cantidad) => t('resultados', { cantidad })}
      />

      <TablaDatos
        columnas={columnas}
        datos={pagina.items}
        obtenerId={(s) => `${s.tipo}:${s.id}`}
        etiqueta={t('tabla')}
        mensajeVacio={mensajeVacio}
        orden={{ columna: vista.orden, direccion: vista.dir }}
        onOrdenar={(columnaId) =>
          actualizarParams({
            orden: columnaId === 'espera' ? null : columnaId,
            dir: vista.orden === columnaId && vista.dir === 'asc' ? 'desc' : null,
            pagina: null,
          })
        }
        encabezadoAcciones={t('columnas.acciones')}
        acciones={(s) => (
          <ButtonLink
            variant="outline"
            size="sm"
            render={<Link href={RUTA_DETALLE_SOLICITUD[s.tipo](s.id)} />}
            aria-label={t('verDe', { nombre: nombre(s.persona) })}
          >
            {t('ver')}
          </ButtonLink>
        )}
      />

      <Paginacion
        paginaActual={paginaActual}
        totalPaginas={totalPaginas}
        renderEnlace={(p) => <Link href={hrefPagina(p)} />}
        etiquetaNav={t('paginado')}
      />
    </div>
  );
}
