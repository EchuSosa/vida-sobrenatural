'use client';

import { SessionProvider } from 'next-auth/react';
import type { Session } from 'next-auth';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@vida-sobrenatural/ui';
import type { ReactNode } from 'react';

export function Providers({ children, session }: { children: ReactNode; session: Session | null }) {
  // H-22 (revisión manual, D106): default claro, no "system".
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      {/* H-116: `session` viene del `auth()` que ya corrió en el layout —
          sin pasarlo, SessionProvider arranca en `status: 'loading'` y
          vuelve a pedir la sesión al cliente, un parpadeo evitable cuando
          el servidor ya la tiene. */}
      <SessionProvider session={session}>
        {children}
        {/* aria-live ya incluido en el componente — FR-018 */}
        <Toaster />
      </SessionProvider>
    </ThemeProvider>
  );
}
