'use client';

import { Suspense } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { Button, EstadoVacio } from '@vida-sobrenatural/ui';
import { AvisoPorQuery } from '../components/aviso-por-query';

export default function InicioBackofficePage() {
  const { data: session, status } = useSession();

  if (status === 'loading') return null;

  if (!session) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-16 text-center">
        {/* H-11: aviso breve al volver acá después de cerrar sesión */}
        <Suspense fallback={null}>
          <AvisoPorQuery param="sesion" valor="cerrada" mensaje="Cerraste sesión." />
        </Suspense>
        <h1 className="text-2xl font-semibold">Backoffice — Vida Sobrenatural</h1>
        <p className="text-muted-foreground">Necesitás iniciar sesión para continuar.</p>
        <Button size="xl" onClick={() => signIn('google')}>
          Ingresar con Google
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Inicio</h1>
      <EstadoVacio mensaje="Todavía no hay métricas ni pendientes para mostrar acá." />
    </div>
  );
}
