'use client';

import * as React from 'react';
import { Button } from './ui/button';

/**
 * spec 007 (T013, FR-001, clarify): "Entrar con Google", en las dos apps y en
 * el mismo lugar: arriba del formulario de código, con **contorno** (la acción
 * principal de la pantalla es "Enviarme el código", que sirve para cualquier
 * email). Antes vivía solo en el backoffice (H-60, H-116).
 *
 * `onIngresar` lo pone cada app (`signIn('google', { callbackUrl })` de su
 * Auth.js, con el destino que corresponde: `/ingresar` en la web, la ruta en
 * la que se estaba en el backoffice), igual que `EntrarDePrueba`: así
 * `packages/ui` no depende de `next-auth`.
 */
export function BotonIngresarGoogle({ onIngresar, children }: { onIngresar: () => void; children: React.ReactNode }) {
  return (
    <Button type="button" size="xl" variant="outline" className="w-full text-base" onClick={onIngresar}>
      {children}
    </Button>
  );
}
