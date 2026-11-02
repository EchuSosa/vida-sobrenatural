'use client';

import { SessionProvider } from 'next-auth/react';
import type { Session } from 'next-auth';
import type { ReactNode } from 'react';

/**
 * Casos infelices (2026-11-01): el `SessionProvider` de la raíz arranca en `status: 'loading'` (la
 * raíz no lee la sesión para que las páginas públicas sigan siendo estáticas). Mientras tanto
 * `session?.apiToken` es `undefined`, y una acción tocada enseguida (ej. "Buscar grupos") salía
 * con `Bearer undefined` y la API respondía 401. Dentro de la app privada la sesión ya la leyó el
 * layout: se la pasamos a un provider propio, como hace el backoffice (H-116).
 */
export function SesionInicial({ session, children }: { session: Session; children: ReactNode }) {
  return <SessionProvider session={session}>{children}</SessionProvider>;
}
