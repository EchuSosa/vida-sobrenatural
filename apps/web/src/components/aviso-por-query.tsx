'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

/**
 * Aviso breve reutilizable (D102, matriz de feedback de
 * docs/16-sistemas-transversales.md): si el parámetro de la URL indicado
 * coincide con el valor esperado, muestra un toast una sola vez y limpia el
 * parámetro (para que recargar la página no lo repita). Usado por H-16
 * (specs/001-fase-bienvenida) y H-11 (specs/002-base-transversal) —
 * actualización 2026-09-18.
 *
 * Requiere un <Suspense> por encima (useSearchParams) para no forzar
 * renderizado dinámico de la página que lo usa.
 */
export function AvisoPorQuery({
  param,
  valor,
  mensaje,
}: {
  param: string;
  valor: string;
  mensaje: string;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const yaAvisado = useRef(false);

  useEffect(() => {
    if (yaAvisado.current || searchParams.get(param) !== valor) return;
    yaAvisado.current = true;
    toast(mensaje);
    const params = new URLSearchParams(searchParams);
    params.delete(param);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [searchParams, param, valor, mensaje, router, pathname]);

  return null;
}
