'use client';

import type { ReactNode } from 'react';
import { Search } from 'lucide-react';
import { cn } from '../lib/utils';
import { Input } from './ui/input';
import { Button } from './ui/button';

export interface ControlesTablaProps {
  /** Valor actual del cuadro de búsqueda — controlado, sin estado propio (H-88/D126). */
  busqueda: string;
  onBuscarChange: (valor: string) => void;
  /** Texto del `<label>` VISIBLE del cuadro de búsqueda — nunca solo placeholder. */
  etiquetaBusqueda: string;
  placeholderBusqueda?: string;
  /** Único en la pantalla si hay más de un `ControlesTabla` — no debería pasar, pero por las dudas. */
  idBusqueda?: string;
  /** Los filtros de la pantalla (ej. Activas/Todas) — qué son y qué hacen es del dominio, esto solo los ubica. */
  filtros?: ReactNode;
  /** Muestra el botón "Limpiar" — lo decide la pantalla (busqueda y/o algún filtro con un valor no-default). */
  hayAlgoAplicado: boolean;
  onLimpiar: () => void;
  /** Cantidad de filas que el filtrado actual deja ver — para la región viva. */
  cantidadResultados: number;
  /** Default: "N resultado(s)". Pisable si una pantalla necesita otra forma (ej. "N de M casos"). */
  etiquetaResultados?: (cantidad: number) => string;
  className?: string;
}

const mensajeResultadosDefault = (cantidad: number) => `${cantidad} ${cantidad === 1 ? 'resultado' : 'resultados'}`;

/**
 * H-88 (revisión manual, revisa el criterio de H-69): la capa del medio que
 * faltaba entre TablaDatos (que nunca tuvo búsqueda ni filtros, a
 * propósito) y cada pantalla (que nunca los armó, en la práctica, porque
 * "cada una arma los suyos" es lo mismo que "nadie los arma"). Este
 * componente decide CÓMO se ve un cuadro de búsqueda + los filtros de la
 * pantalla + un botón de limpiar — no QUÉ se busca ni QUÉ filtros hay, eso
 * sigue siendo de cada pantalla (el criterio original de H-69 acertaba en
 * eso). Tampoco decide CÓMO se sincroniza con la URL — de eso se ocupa
 * `useControlesTablaUrl`, un hook aparte: un componente puramente
 * controlado es más fácil de tipar, testear y (H-88 dixit) no puede asumir
 * que el filtrado es en memoria si no sabe nada de cómo llegan `datos`.
 *
 * Accesibilidad (se rompe fácil en un buscador):
 * - `<label>` visible, nunca solo `placeholder` (que desaparece al escribir
 *   y no lo leen todos los lectores de pantalla del mismo modo).
 * - La cantidad de resultados es una región viva (`aria-live="polite"`) —
 *   sin esto, quien no ve la tabla no se entera de que el filtro cambió
 *   algo. Visible además de anunciada: a quien sí ve la tabla también le
 *   sirve ver el número, sobre todo cuando el filtro no deja ninguna fila.
 * - "Limpiar" es un `<button>` real — con teclado alcanza (Tab + Enter/Espacio).
 */
export function ControlesTabla({
  busqueda,
  onBuscarChange,
  etiquetaBusqueda,
  placeholderBusqueda,
  idBusqueda = 'controles-tabla-busqueda',
  filtros,
  hayAlgoAplicado,
  onLimpiar,
  cantidadResultados,
  etiquetaResultados,
  className,
}: ControlesTablaProps) {
  const mensajeResultados = (etiquetaResultados ?? mensajeResultadosDefault)(cantidadResultados);

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-40 flex-1 flex-col gap-1">
          <label htmlFor={idBusqueda} className="text-sm font-medium">
            {etiquetaBusqueda}
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id={idBusqueda}
              type="search"
              value={busqueda}
              onChange={(e) => onBuscarChange(e.target.value)}
              placeholder={placeholderBusqueda}
              className="pl-8"
            />
          </div>
        </div>
        {filtros}
        {hayAlgoAplicado && (
          <Button type="button" variant="ghost" size="sm" onClick={onLimpiar}>
            Limpiar
          </Button>
        )}
      </div>
      <p aria-live="polite" className="text-sm text-muted-foreground">
        {mensajeResultados}
      </p>
    </div>
  );
}
