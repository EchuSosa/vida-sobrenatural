/* eslint-disable local/pantalla-declara-permiso -- H-R13: herramienta de desarrollo, no una pantalla del backoffice: no va en el menú ni pide permiso; la cierra testLoginHabilitado() (404 en producción o sin ALLOW_TEST_LOGIN). Sin sesión, el layout muestra PantallaSinSesion, que ofrece el mismo login de prueba. */
import { notFound } from 'next/navigation';
import { testLoginHabilitado } from '@vida-sobrenatural/shared-types/auth-server';
import { EntrarDePruebaCliente } from './entrar-de-prueba-cliente';

export const metadata = {
  robots: { index: false, follow: false },
};

/**
 * H-R13 (revisión manual de la 004): login de prueba con pantalla. Solo existe
 * con `ALLOW_TEST_LOGIN=true` y fuera de producción (`testLoginHabilitado()`,
 * el mismo gate que el proveedor `test-login`); si no, 404. En el backoffice,
 * sin sesión el layout muestra `PantallaSinSesion` en cualquier URL (también
 * acá), que trae el mismo formulario; esta página sirve para cambiar de
 * persona con una sesión ya abierta.
 */
export default function EntrarDePruebaPage() {
  if (!testLoginHabilitado()) notFound();
  return (
    <main id="contenido" className="mx-auto flex w-full max-w-xl flex-col gap-4 px-4 py-12">
      <EntrarDePruebaCliente nivelTitulo="h1" />
    </main>
  );
}
