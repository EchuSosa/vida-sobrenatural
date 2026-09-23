import { Suspense } from 'react';
import { AvisoPorQuery } from './aviso-por-query';
import { BotonIngresarGoogle } from './boton-ingresar-google';

/**
 * H-116 (revisión manual): la única pantalla de "necesitás iniciar sesión"
 * de todo el backoffice — antes cada `page.tsx` armaba la suya, con su
 * propio `<h1>` repitiendo el nombre de la sección (una para Libros, otra
 * para Sedes...). Con el chequeo de sesión centralizado en
 * `apps/backoffice/src/app/layout.tsx`, esta es la que se ve sin importar
 * qué URL se haya pedido — deja de sentirse "rota" (un `<h1>` suelto sobre
 * fondo vacío) porque ahora es una pantalla real, pensada como tal.
 */
export function PantallaSinSesion() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-16 text-center">
      {/* H-11: aviso breve al volver acá después de cerrar sesión. */}
      <Suspense fallback={null}>
        <AvisoPorQuery param="sesion" valor="cerrada" mensaje="Cerraste sesión." />
      </Suspense>
      <h1 className="text-2xl font-semibold">Backoffice — Vida Sobrenatural</h1>
      <p className="text-muted-foreground">Necesitás iniciar sesión para continuar.</p>
      <BotonIngresarGoogle>Ingresar con Google</BotonIngresarGoogle>
    </div>
  );
}
