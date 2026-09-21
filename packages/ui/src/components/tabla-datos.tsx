'use client';

import type { ReactNode } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { cn } from '../lib/utils';
import { Skeleton } from './ui/skeleton';
import { EstadoVacio } from './estado-vacio';

/**
 * H-69 (revisión manual ronda 6): tabla compartida — Sedes y Pendientes de
 * tutor son los primeros consumidores, pero el patrón nace acá para que
 * Personas, Solicitudes, Eventos y los Catálogos no inventen cada uno el
 * suyo (Principio XI). `<table>` real con `<th scope="col">`, no `div`s con
 * rol — para que el smoke de axe la recorra de verdad.
 *
 * Búsqueda y filtros NO son parte de este componente: cada pantalla los
 * arma con sus propios controles (Sedes ya tiene "Activas"/"Todas") y se
 * los pasa reflejados en la URL — esta tabla solo necesita `datos` ya
 * filtrados. El orden si vive acá (es genérico a cualquier columna), pero
 * el estado de qué columna/dirección y su reflejo en la URL los decide
 * quien la usa (`onOrdenar`), no la tabla.
 *
 * Celular (H-62, H-69): cada columna puede traer su propia `className`
 * responsive (ej. "hidden sm:table-cell") para decidir qué se oculta —
 * `overflow-x-auto` en el contenedor es una red de seguridad, no la
 * solución: si una pantalla no oculta lo suficiente, el scroll queda
 * contenido en la tabla y no en el documento, pero la meta es que a 320px
 * no haga falta ni eso.
 */
export interface ColumnaTabla<T> {
  /** Clave estable — la usa `onOrdenar` y quien arma el query param de orden en la URL. */
  id: string;
  encabezado: string;
  celda: (fila: T) => ReactNode;
  ordenable?: boolean;
  /** Aplicada a `<th>` y `<td>` — ej. "hidden sm:table-cell". */
  className?: string;
}

export interface OrdenTabla {
  columna: string;
  direccion: 'asc' | 'desc';
}

export interface TablaDatosProps<T> {
  columnas: ColumnaTabla<T>[];
  datos: T[];
  obtenerId: (fila: T) => string;
  /** Nombre accesible de la tabla (`<caption>` oculto) — no todas las pantallas tienen un <h1> inmediatamente arriba. */
  etiqueta: string;
  cargando?: boolean;
  filasEsqueleto?: number;
  mensajeVacio: string;
  accionVacio?: ReactNode;
  acciones?: (fila: T) => ReactNode;
  encabezadoAcciones?: string;
  orden?: OrdenTabla;
  onOrdenar?: (columnaId: string) => void;
}

export function TablaDatos<T>({
  columnas,
  datos,
  obtenerId,
  etiqueta,
  cargando = false,
  filasEsqueleto = 5,
  mensajeVacio,
  accionVacio,
  acciones,
  encabezadoAcciones = 'Acciones',
  orden,
  onOrdenar,
}: TablaDatosProps<T>) {
  const totalColumnas = columnas.length + (acciones ? 1 : 0);

  // Los cuatro estados (Principio VIII): acá, vacío — cargando y con datos
  // comparten la misma estructura de <table> más abajo (para no duplicar
  // encabezados), éxito son las filas con datos, error lo maneja quien usa
  // la tabla (no le llega ni `datos` ni `cargando` hasta resolverlo).
  if (!cargando && datos.length === 0) {
    return <EstadoVacio mensaje={mensajeVacio} accion={accionVacio} />;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">{etiqueta}</caption>
        <thead>
          <tr className="border-b border-border">
            {columnas.map((columna) => (
              <th
                key={columna.id}
                scope="col"
                aria-sort={
                  !columna.ordenable
                    ? undefined
                    : orden?.columna === columna.id
                      ? orden.direccion === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : 'none'
                }
                className={cn('px-3 py-2 text-left font-medium text-muted-foreground', columna.className)}
              >
                {columna.ordenable && onOrdenar ? (
                  <button
                    type="button"
                    onClick={() => onOrdenar(columna.id)}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    {columna.encabezado}
                    <IconoOrden activa={orden?.columna === columna.id} direccion={orden?.direccion} />
                  </button>
                ) : (
                  columna.encabezado
                )}
              </th>
            ))}
            {acciones && (
              <th scope="col" className="px-3 py-2 text-right font-medium text-muted-foreground">
                {encabezadoAcciones}
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {cargando
            ? Array.from({ length: filasEsqueleto }).map((_, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  {Array.from({ length: totalColumnas }).map((__, j) => (
                    <td key={j} className="px-3 py-3">
                      <Skeleton className="h-4 w-full max-w-32" />
                    </td>
                  ))}
                </tr>
              ))
            : datos.map((fila) => (
                <tr key={obtenerId(fila)} className="border-b border-border last:border-0 hover:bg-muted/50">
                  {columnas.map((columna) => (
                    <td key={columna.id} className={cn('px-3 py-3', columna.className)}>
                      {columna.celda(fila)}
                    </td>
                  ))}
                  {acciones && <td className="px-3 py-3 text-right">{acciones(fila)}</td>}
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  );
}

function IconoOrden({ activa, direccion }: { activa?: boolean; direccion?: 'asc' | 'desc' }) {
  if (!activa) return <ArrowUpDown className="size-3.5 text-muted-foreground/50" aria-hidden="true" />;
  return direccion === 'asc' ? (
    <ArrowUp className="size-3.5" aria-hidden="true" />
  ) : (
    <ArrowDown className="size-3.5" aria-hidden="true" />
  );
}
