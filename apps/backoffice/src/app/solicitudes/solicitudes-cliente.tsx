'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { CircleCheck, CircleX, Clock, Send, Undo2 } from 'lucide-react';
import { type Pagina, type SolicitudResumen, formatearFechaHora } from '@vida-sobrenatural/shared-types';
import { ControlesTabla, Paginacion, TablaDatos, type ColumnaTabla, type OrdenTabla } from '@vida-sobrenatural/ui';
import { useControlesTablaUrl } from '../../hooks/use-controles-tabla-url';
import { PedirEnNombreDe } from '../../components/pedir-en-nombre-de';
import { FILTROS_ESTADO, diasDesde, type FiltroEstado } from './constantes';

const ICONO_ESTADO = { pendiente: Clock, propuesta: Send, aprobada: CircleCheck, rechazada: CircleX, retirada: Undo2 } as const;

/** El estado de una Solicitud con texto e ícono, nunca solo color (D81). En `propuesta`, a quién y hace cuánto (FR-038). */
export function EstadoSolicitudTexto({ solicitud }: { solicitud: Pick<SolicitudResumen, 'estado' | 'propuestaVigente'> }) {
  const t = useTranslations('solicitudes.estados');
  const Icono = ICONO_ESTADO[solicitud.estado];
  const vigente = solicitud.propuestaVigente;
  return (
    <span className="inline-flex items-start gap-1.5">
      <Icono aria-hidden className="mt-0.5 size-4 shrink-0" />
      <span>
        {solicitud.estado === 'propuesta' && vigente
          ? t('propuesta', { nombre: `${vigente.discipulador.nombre} ${vigente.discipulador.apellido}`, dias: diasDesde(vigente.propuestaEn) })
          : t(solicitud.estado === 'propuesta' ? 'pendiente' : solicitud.estado)}
      </span>
    </span>
  );
}

/**
 * specs/004, T027: la bandeja. Los datos llegan de page.tsx (Server
 * Component); acá solo la sincronización de búsqueda, estado, orden y página
 * con la URL (H-88, H-101) y "Pedir Vida Nueva en nombre de…" para quien
 * tiene `solicitudes.crear_en_nombre`. Cada fila lleva al detalle.
 */
export function SolicitudesCliente({
  pagina,
  paginaActual,
  totalPaginas,
  filtro,
  orden,
  apiToken,
  puedeCrearEnNombre,
}: {
  pagina: Pagina<SolicitudResumen>;
  paginaActual: number;
  totalPaginas: number;
  filtro: FiltroEstado;
  orden: OrdenTabla;
  apiToken: string;
  puedeCrearEnNombre: boolean;
}) {
  const t = useTranslations('solicitudes');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { busqueda, setBusqueda, actualizarParams, limpiar } = useControlesTablaUrl({ clavesAReiniciarConBusqueda: ['pagina'] });

  function hrefPagina(numero: number): string {
    const params = new URLSearchParams(searchParams);
    if (numero <= 1) params.delete('pagina');
    else params.set('pagina', String(numero));
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  const nombre = (p: { nombre: string; apellido: string }) => `${p.nombre} ${p.apellido}`;

  const columnas: ColumnaTabla<SolicitudResumen>[] = [
    {
      id: 'persona',
      encabezado: t('columnas.persona'),
      ordenable: true,
      celda: (s) => (
        <Link href={`/solicitudes/${s.id}`} className="font-medium underline underline-offset-2">
          {nombre(s.persona)}
        </Link>
      ),
    },
    { id: 'estado', encabezado: t('columnas.estado'), celda: (s) => <EstadoSolicitudTexto solicitud={s} /> },
    {
      id: 'fecha',
      encabezado: t('columnas.pedida'),
      ordenable: true,
      className: 'hidden sm:table-cell',
      celda: (s) => formatearFechaHora(s.createdAt, locale),
    },
    {
      id: 'creadaPor',
      encabezado: t('columnas.creadaPor'),
      className: 'hidden md:table-cell',
      celda: (s) => (s.creadoPor ? nombre(s.creadoPor) : t('laPersona')),
    },
    {
      id: 'revisadaPor',
      encabezado: t('columnas.revisadaPor'),
      className: 'hidden lg:table-cell',
      celda: (s) => (s.revisadoPor ? nombre(s.revisadoPor) : t('sinDato')),
    },
  ];

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-16">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">{t('titulo')}</h1>
        <p className="text-muted-foreground">{t('descripcion')}</p>
      </div>

      {puedeCrearEnNombre && <PedirEnNombreDe apiToken={apiToken} onCreado={() => router.refresh()} />}

      <ControlesTabla
        busqueda={busqueda}
        onBuscarChange={setBusqueda}
        etiquetaBusqueda={t('buscar')}
        placeholderBusqueda={t('buscarPlaceholder')}
        filtros={
          <label className="flex flex-col gap-1 text-sm font-medium">
            {t('filtroEstado')}
            <select
              value={filtro}
              onChange={(e) => actualizarParams({ estado: e.target.value === 'abiertas' ? null : e.target.value, pagina: null })}
              className="h-10 rounded-md border border-input bg-transparent px-2 text-sm font-normal dark:bg-input/30"
            >
              {FILTROS_ESTADO.map((f) => (
                <option key={f} value={f}>
                  {t(`filtros.${f}`)}
                </option>
              ))}
            </select>
          </label>
        }
        hayAlgoAplicado={busqueda.trim() !== '' || filtro !== 'abiertas'}
        onLimpiar={() => limpiar(['estado', 'pagina'])}
        cantidadResultados={pagina.total}
        etiquetaResultados={(cantidad) => t('resultados', { cantidad })}
      />

      <TablaDatos
        columnas={columnas}
        datos={pagina.items}
        obtenerId={(s) => s.id}
        etiqueta={t('tabla')}
        mensajeVacio={busqueda.trim() ? t('vacioBusqueda', { q: busqueda.trim() }) : t('vacio')}
        orden={orden}
        onOrdenar={(columnaId) =>
          actualizarParams({
            orden: columnaId === 'fecha' ? null : columnaId,
            dir: orden.columna === columnaId && orden.direccion === 'asc' ? 'desc' : null,
            pagina: null,
          })
        }
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
