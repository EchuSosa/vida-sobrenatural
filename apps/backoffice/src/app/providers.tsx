'use client';

import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@vida-sobrenatural/ui';
import type { ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  // H-22 (revisión manual, D106): default claro, no "system".
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <SessionProvider>
        {children}
        {/* aria-live ya incluido en el componente — FR-018 */}
        <Toaster />
      </SessionProvider>
    </ThemeProvider>
  );
}
