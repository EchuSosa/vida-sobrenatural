'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

/**
 * Aviso breve reutilizable (D102, matriz de feedback de
 * docs/16-sistemas-transversales.md) — mismo componente que
 * apps/web/src/components/aviso-por-query.tsx (no compartido vía
 * packages/ui por ser específico de cada app, sin más consumidores por
 * ahora). H-11, actualización 2026-09-18.
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
