'use client';

import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@vida-sobrenatural/ui';
import type { ReactNode } from 'react';
import { OfflineBanner } from './../components/offline-banner';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <SessionProvider>
        <OfflineBanner />
        {children}
        {/* aria-live ya incluido en el componente — FR-018 */}
        <Toaster />
      </SessionProvider>
    </ThemeProvider>
  );
}
