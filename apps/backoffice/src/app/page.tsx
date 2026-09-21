import { Suspense } from 'react';
import { auth } from '../auth';
import { EstadoVacio } from '@vida-sobrenatural/ui';
import { AvisoPorQuery } from '../components/aviso-por-query';
import { BotonIngresarGoogle } from '../components/boton-ingresar-google';

/**
 * H-60 (revisión manual ronda 7): sin datos que traer, pero contaba entre
 * los cinco `page.tsx` de cliente enteros de la finding — el chequeo de
 * sesión pasa a `auth()` server-side (mismo patrón que ya usa
 * apps/web/(app)/layout.tsx), y "Ingresar con Google" queda como la única
 * isla de cliente.
 */
export default async function InicioBackofficePage() {
  const session = await auth();

  if (!session) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-16 text-center">
        {/* H-11: aviso breve al volver acá después de cerrar sesión */}
        <Suspense fallback={null}>
          <AvisoPorQuery param="sesion" valor="cerrada" mensaje="Cerraste sesión." />
        </Suspense>
        <h1 className="text-2xl font-semibold">Backoffice — Vida Sobrenatural</h1>
        <p className="text-muted-foreground">Necesitás iniciar sesión para continuar.</p>
        <BotonIngresarGoogle>Ingresar con Google</BotonIngresarGoogle>
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
