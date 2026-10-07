import { notFound } from 'next/navigation';
import { testLoginHabilitado } from '@vida-sobrenatural/shared-types/auth-server';
import { EntrarDePruebaCliente } from './entrar-de-prueba-cliente';

export const metadata = {
  robots: { index: false, follow: false },
};

/**
 * H-R13 (revisión manual de la 004): login de prueba con pantalla. Solo existe
 * con `ALLOW_TEST_LOGIN=true` y fuera de producción (`testLoginHabilitado()`,
 * el mismo gate que el proveedor `test-login`); si no, 404.
 */
export default function EntrarDePruebaPage() {
  if (!testLoginHabilitado()) notFound();
  return (
    <main id="contenido" className="mx-auto flex w-full max-w-xl flex-col gap-4 px-4 py-12">
      <EntrarDePruebaCliente nivelTitulo="h1" />
    </main>
  );
}
