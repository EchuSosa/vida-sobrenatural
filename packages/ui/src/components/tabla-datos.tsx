'use client';

import type { ComponentType, ReactNode } from 'react';
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
 * Búsqueda y filtros NO son parte de este componente — esta tabla solo
 * necesita `datos` ya filtrados. El orden si vive acá (es genérico a
 * cualquier columna), pero el estado de qué columna/dirección y su reflejo
 * en la URL los decide quien la usa (`onOrdenar`), no la tabla.
 *
 * H-88 (revisión manual): el comentario acá decía que "cada pantalla arma
 * sus propios controles" de búsqueda/filtros — ese criterio (H-69) hizo que
 * en la práctica ninguna los armara. La capa que faltaba es
 * `ControlesTabla` + `useControlesTablaUrl` (ver controles-tabla.tsx):
 * quien use esta tabla ahora arma QUÉ se busca y QUÉ filtros hay con esa
 * pieza, no con controles sueltos a mano.
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

/**
 * H-60 (revisión manual ronda 7): esqueleto exportado aparte — un
 * `loading.tsx` (Server Component route) no tiene `datos` todavía, así que
 * no puede montar un `<TablaDatos cargando>` con `celda` reales. Recibe
 * solo la forma de las columnas (id/encabezado/className), no cómo se
 * renderiza cada una — TablaDatos lo reutiliza para su propia rama
 * `cargando`, una sola definición del esqueleto (Principio XI).
 */
export interface TablaEsqueletoProps {
  columnas: { id: string; encabezado: string; className?: string }[];
  conAcciones?: boolean;
  encabezadoAcciones?: string;
  filas?: number;
}

export function TablaEsqueleto({ columnas, conAcciones = false, encabezadoAcciones = 'Acciones', filas = 5 }: TablaEsqueletoProps) {
  const totalColumnas = columnas.length + (conAcciones ? 1 : 0);
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border">
            {columnas.map((columna) => (
              <th
                key={columna.id}
                scope="col"
                className={cn('px-3 py-2 text-left font-medium text-muted-foreground', columna.className)}
              >
                {columna.encabezado}
              </th>
            ))}
            {conAcciones && (
              <th scope="col" className="px-3 py-2 text-right font-medium text-muted-foreground">
                {encabezadoAcciones}
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: filas }).map((_, i) => (
            <tr key={i} className="border-b border-border last:border-0">
              {Array.from({ length: totalColumnas }).map((__, j) => (
                <td key={j} className="px-3 py-3">
                  <Skeleton className="h-4 w-full max-w-32" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
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
  /**
   * H-89: reemplaza el `<tr>` de cada fila por este componente — la única
   * forma de que un hook por fila (ej. `useSortable` de dnd-kit) se pueda
   * llamar sin romper las Reglas de los Hooks (cada fila necesita ser su
   * propia instancia de componente, no una función invocada dentro de un
   * `.map()`). Tiene que renderizar un `<tr>` real (o reenviar `children`
   * a uno) — TablaDatos no sabe nada de dnd-kit ni de cómo arrastrar,
   * sigue siendo agnóstica; solo cede el nodo de la fila a quien la usa.
   */
  EnvoltorioFila?: ComponentType<{ fila: T; children: ReactNode }>;
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
  EnvoltorioFila,
}: TablaDatosProps<T>) {
  // Los cuatro estados (Principio VIII) — error lo maneja quien usa la
  // tabla (no le llega ni `datos` ni `cargando` hasta resolverlo). La
  // mayoría de las pantallas ya no necesitan esta rama (el fetch inicial
  // vive en el Server Component y lo cubre loading.tsx con TablaEsqueleto,
  // H-60) — queda para cuando un filtro/búsqueda se resuelve en cliente.
  if (cargando) {
    return (
      <TablaEsqueleto columnas={columnas} conAcciones={!!acciones} encabezadoAcciones={encabezadoAcciones} filas={filasEsqueleto} />
    );
  }
  if (datos.length === 0) {
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
          {datos.map((fila) => {
            const celdas = (
              <>
                {columnas.map((columna) => (
                  <td key={columna.id} className={cn('px-3 py-3', columna.className)}>
                    {columna.celda(fila)}
                  </td>
                ))}
                {acciones && <td className="px-3 py-3 text-right">{acciones(fila)}</td>}
              </>
            );
            return EnvoltorioFila ? (
              <EnvoltorioFila key={obtenerId(fila)} fila={fila}>
                {celdas}
              </EnvoltorioFila>
            ) : (
              <tr key={obtenerId(fila)} className="border-b border-border last:border-0 hover:bg-muted/50">
                {celdas}
              </tr>
            );
          })}
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
