'use client';

import { signIn, useSession } from 'next-auth/react';
import { EstadoVacio } from '@vida-sobrenatural/ui';

export default function InicioBackofficePage() {
  const { data: session, status } = useSession();

  if (status === 'loading') return null;

  if (!session) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold">Backoffice — Vida Sobrenatural</h1>
        <p className="text-zinc-600 dark:text-zinc-400">Necesitás iniciar sesión para continuar.</p>
        <button
          type="button"
          onClick={() => signIn('google')}
          className="flex h-11 items-center justify-center rounded-lg bg-primary px-5 font-medium text-primary-foreground hover:bg-primary/80"
        >
          Ingresar con Google
        </button>
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
