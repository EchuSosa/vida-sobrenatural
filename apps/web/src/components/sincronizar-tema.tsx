'use client';

import { useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useSession } from 'next-auth/react';

const TEMA_A_NEXT_THEMES: Record<string, string> = {
  claro: 'light',
  oscuro: 'dark',
  sistema: 'system',
};

/**
 * Aplica la preferencia de tema guardada en la Persona (D95) apenas hay
 * sesión — T078. Vive solo en `(app)/layout.tsx`, no en el layout raíz: el
 * layout raíz también envuelve las páginas públicas, que deben quedar
 * estáticas para SEO (Historia 7); resolver la sesión ahí las volvería
 * dinámicas a todas. El costo de este approach es un posible flash breve
 * (localStorage/sistema → preferencia guardada) solo dentro de la sección
 * con sesión, no en el sitio público.
 */
export function SincronizarTema() {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    const preferido = session?.user.temaPreferido;
    if (!preferido) return;
    const valor = TEMA_A_NEXT_THEMES[preferido];
    if (valor && valor !== theme) {
      setTheme(valor);
    }
    // Solo al cambiar la sesión — no repetir en cada cambio de `theme` (que
    // el propio usuario puede elegir manualmente después).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user.temaPreferido]);

  return null;
}
