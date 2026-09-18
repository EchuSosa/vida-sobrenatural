'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';

const CLAVE = 'registroRecienCompletado';

/**
 * H-15 (actualización 2026-09-18, specs/001-fase-bienvenida Phase 9): guarda
 * de "recién completado" para /registro/listo — el Server Component ya
 * exige sesión con estado activa (auth()), pero eso solo no distingue a
 * quien recién se registró de cualquier Miembro registrado que entra por
 * URL en otro momento. El flag lo setea registro/page.tsx justo antes de
 * navegar acá, en la misma pestaña.
 */
export function GuardaRegistroReciente({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [estado, setEstado] = useState<'verificando' | 'ok'>('verificando');
  // React Strict Mode (dev) invoca el efecto dos veces a propósito para
  // detectar efectos no idempotentes — sin esta ref, la primera pasada
  // consume (removeItem) el flag y la segunda ya no lo encuentra, mandando
  // a Inicio a alguien que sí se acababa de registrar. La ref persiste
  // entre esas dos invocaciones simuladas (no son un remount real).
  const yaVerificado = useRef(false);

  useEffect(() => {
    if (yaVerificado.current) return;
    yaVerificado.current = true;

    const recienCompletado = window.sessionStorage.getItem(CLAVE) === '1';
    window.sessionStorage.removeItem(CLAVE);
    if (recienCompletado) {
      // No hay forma de leer sessionStorage sin arriesgar un mismatch de
      // hidratación (SSR no tiene `window`) — se corrige acá a propósito,
      // mismo patrón justificado que apps/web/src/components/offline-banner.tsx.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEstado('ok');
    } else {
      router.replace('/');
    }
  }, [router]);

  if (estado === 'verificando') return null;
  return <>{children}</>;
}
