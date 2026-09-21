'use client';

import { signIn } from 'next-auth/react';
import { Button } from '@vida-sobrenatural/ui';

/**
 * H-60 (revisión manual ronda 7): con las pantallas del backoffice pasando
 * a Server Components, el botón "Continuar con Google" es de las pocas
 * piezas que sí necesitan cliente (`signIn` es una función de
 * `next-auth/react`) — se comparte en vez de repetirlo (antes estaba
 * copiado a mano en cada page.tsx, Principio XI).
 */
export function BotonIngresarGoogle({ children = 'Continuar con Google' }: { children?: React.ReactNode }) {
  return (
    <Button size="xl" onClick={() => signIn('google')}>
      {children}
    </Button>
  );
}
