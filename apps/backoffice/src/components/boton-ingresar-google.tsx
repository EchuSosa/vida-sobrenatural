'use client';

import { usePathname } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Button } from '@vida-sobrenatural/ui';

/**
 * H-60 (revisión manual ronda 7): con las pantallas del backoffice pasando
 * a Server Components, el botón "Continuar con Google" es de las pocas
 * piezas que sí necesitan cliente (`signIn` es una función de
 * `next-auth/react`) — se comparte en vez de repetirlo (antes estaba
 * copiado a mano en cada page.tsx, Principio XI).
 *
 * H-116: `callbackUrl: pathname` — sin esto, entrar a /libros sin sesión e
 * ingresar dejaba a la persona en la raíz, no en /libros. Mismo problema
 * que H-85 resolvió del lado de la web pública (ahí con un destino que
 * depende del estado de la Persona; acá alcanza con volver adonde se
 * estaba, no hay un estado que resolver primero).
 */
export function BotonIngresarGoogle({ children = 'Continuar con Google' }: { children?: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <Button size="xl" onClick={() => signIn('google', { callbackUrl: pathname })}>
      {children}
    </Button>
  );
}
