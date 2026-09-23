'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export interface UseControlesTablaUrlOpciones {
  /** Nombre del query param de búsqueda. Default 'q'. */
  parametroBusqueda?: string;
  /** Cuánto esperar sin tipear antes de escribir la búsqueda en la URL. Default 300ms. */
  debounceMs?: number;
  /**
   * Claves adicionales que se borran cada vez que `setBusqueda` escribe en
   * la URL — pensado para `['pagina']` en un listado paginado
   * (H-101/D-paginado): cambiar la búsqueda tiene que volver a la primera
   * página, si no, buscar algo con pocos resultados estando en la página 4
   * muestra vacío en vez de lo que corresponde. Opcional y sin default
   * (`[]`) a propósito: los listados que todavía filtran en memoria
   * (Sedes, Libros, Palabra Profética, las dos papeleras) no paginan de
   * verdad, así que no tienen nada que reiniciar acá — no cambia nada para
   * ellos si no lo pasan.
   */
  clavesAReiniciarConBusqueda?: string[];
}

export interface ControlesTablaUrl {
  /** Valor local, actualizado en cada tecla — lo que hay que pasarle a `ControlesTabla.busqueda`. */
  busqueda: string;
  /** Actualiza el valor local al toque y programa la escritura a la URL (debounced). */
  setBusqueda: (valor: string) => void;
  /**
   * Setter genérico de query params, sin debounce — para filtros de
   * elección discreta (ej. Activas/Todas), donde cada click ya es una
   * acción puntual, no algo que haya que esperar a que termine de "tipear".
   * `null` o `''` borra la clave.
   */
  actualizarParams: (cambios: Record<string, string | null>) => void;
  /** Limpia la búsqueda y las claves de filtro que le pases, en un solo push. */
  limpiar: (clavesFiltro?: string[]) => void;
}

/**
 * H-88 (D126): la mitad de `ControlesTabla` (@vida-sobrenatural/ui) que
 * decide CÓMO se sincroniza con la URL — que quede ahí (no en `useState`)
 * es lo que hace que un filtro se pueda compartir por mensaje y sobreviva a
 * un F5 y al botón de atrás.
 *
 * Vive en `apps/backoffice`, NO en `packages/ui`, a propósito: necesita
 * `next/navigation` (useRouter/usePathname/useSearchParams), y
 * `packages/ui` no depende de Next (docs/10-stack-tecnico.md) — se
 * consume como fuente TypeScript desde cualquier bundler, no solo el de
 * Next. `ControlesTabla` (el componente, puramente controlado) sí es
 * agnóstico y queda en `ui`; este hook es específico de App Router y hoy
 * solo lo consume `apps/backoffice` (los seis listados) — `apps/web` no
 * tiene listados con búsqueda/filtro/orden.
 *
 * La búsqueda se debounce ACÁ (no en `ControlesTabla`, que se queda
 * puramente controlado) para no empujar una entrada nueva al historial por
 * cada tecla — los filtros discretos (`actualizarParams`, mismo patrón que
 * ya usaban sedes-cliente.tsx/libros-cliente.tsx antes de este hook) no lo
 * necesitan.
 *
 * Deliberadamente NO sabe nada de `datos` ni de cómo se filtran — eso es
 * justo lo que cada pantalla decide (memoria hoy en Sedes/Libros/Palabra
 * Profética/papeleras, un query param a la API en Pendientes de tutor,
 * donde ya hay paginación server-side): el hook solo lee y escribe la URL.
 */
export function useControlesTablaUrl(opciones: UseControlesTablaUrlOpciones = {}): ControlesTablaUrl {
  const parametroBusqueda = opciones.parametroBusqueda ?? 'q';
  const debounceMs = opciones.debounceMs ?? 300;
  const clavesAReiniciarConBusqueda = opciones.clavesAReiniciarConBusqueda ?? [];
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const valorUrl = searchParams.get(parametroBusqueda) ?? '';

  const [busqueda, setBusquedaLocal] = useState(valorUrl);
  // "Ajustar estado cuando cambia una prop" (https://react.dev/learn/you-might-not-need-an-effect),
  // durante el render — mismo patrón que pendientes-tutor-cliente.tsx
  // (paginaVista/paginaInicial). `ultimoValorUrl` en estado, no en un ref:
  // un ref no se puede leer ni escribir durante el render.
  const [ultimoValorUrl, setUltimoValorUrl] = useState(valorUrl);
  if (valorUrl !== ultimoValorUrl) {
    setUltimoValorUrl(valorUrl);
    setBusquedaLocal(valorUrl);
  }

  // El id del timeout SÍ es un ref legítimo (H-88): se lee/escribe desde
  // manejadores de evento y el cleanup de un efecto, nunca durante el
  // render — a diferencia de `ultimoValorUrl` arriba, que si se lee/escribe
  // en el cuerpo del render y por eso tiene que ser estado, no ref.
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  // Mismo criterio que `timeoutRef`: se lee solo dentro del callback del
  // timeout de `setBusqueda`, nunca durante el render — así el array que
  // pasa quien llama al hook (una referencia nueva en cada uno de SUS
  // renders si lo escribe inline, como pendientes-tutor-cliente.tsx) no
  // vuelve a crear `setBusqueda` en cada render sin necesidad. Actualizar
  // el ref SÍ tiene que ir en un efecto (no durante el render, como
  // `ultimoValorUrl` arriba): a diferencia de `ultimoValorUrl`, este valor
  // no hace falta que esté al día para ESTE render — solo para cuando el
  // timeout de `setBusqueda` dispare, más tarde.
  const clavesAReiniciarRef = useRef(clavesAReiniciarConBusqueda);
  useEffect(() => {
    clavesAReiniciarRef.current = clavesAReiniciarConBusqueda;
  });

  const actualizarParams = useCallback(
    (cambios: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams);
      for (const [clave, valor] of Object.entries(cambios)) {
        if (valor === null || valor === '') params.delete(clave);
        else params.set(clave, valor);
      }
      const query = params.toString();
      router.push(query ? `${pathname}?${query}` : pathname);
    },
    [searchParams, pathname, router],
  );

  const setBusqueda = useCallback(
    (valor: string) => {
      setBusquedaLocal(valor);
      setUltimoValorUrl(valor);
      clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        const cambios: Record<string, string | null> = { [parametroBusqueda]: valor };
        for (const clave of clavesAReiniciarRef.current) cambios[clave] = null;
        actualizarParams(cambios);
      }, debounceMs);
    },
    [actualizarParams, parametroBusqueda, debounceMs],
  );

  const limpiar = useCallback(
    (clavesFiltro: string[] = []) => {
      clearTimeout(timeoutRef.current);
      setBusquedaLocal('');
      setUltimoValorUrl('');
      const cambios: Record<string, string | null> = { [parametroBusqueda]: null };
      for (const clave of clavesFiltro) cambios[clave] = null;
      actualizarParams(cambios);
    },
    [actualizarParams, parametroBusqueda],
  );

  return { busqueda, setBusqueda, actualizarParams, limpiar };
}
