import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { AvisoPorQuery } from './aviso-por-query';
import { testLoginHabilitado } from '@vida-sobrenatural/shared-types/auth-server';
import { IngresoSinSesion } from './ingreso-sin-sesion';
import { EntrarDePruebaCliente } from '../app/dev/entrar/entrar-de-prueba-cliente';

/**
 * H-116 (revisión manual): la única pantalla de "necesitás iniciar sesión"
 * de todo el backoffice — antes cada `page.tsx` armaba la suya, con su
 * propio `<h1>` repitiendo el nombre de la sección (una para Libros, otra
 * para Sedes...). Con el chequeo de sesión centralizado en
 * `apps/backoffice/src/app/layout.tsx`, esta es la que se ve sin importar
 * qué URL se haya pedido — deja de sentirse "rota" (un `<h1>` suelto sobre
 * fondo vacío) porque ahora es una pantalla real, pensada como tal.
 *
 * spec 007 (T036): Google con contorno, "o" y el ingreso con código por email
 * (FR-001), textos por `next-intl` (D84).
 */
export async function PantallaSinSesion() {
  const t = await getTranslations('ingreso');
  return (
    <div className="mx-auto flex max-w-md flex-col gap-6 px-4 py-16">
      {/* H-11: aviso breve al volver acá después de cerrar sesión. */}
      <Suspense fallback={null}>
        <AvisoPorQuery param="sesion" valor="cerrada" mensaje={t('sesionCerrada')} />
      </Suspense>
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-semibold">{t('titulo')}</h1>
        <p className="text-base text-muted-foreground">{t('intro')}</p>
      </div>
      <IngresoSinSesion />
      {/* H-R13: sin sesión, el layout muestra esta pantalla en cualquier URL — también en
          /dev/entrar —, así que el login de prueba se ofrece acá (solo con testLoginHabilitado()). */}
      {testLoginHabilitado() && <EntrarDePruebaCliente />}
    </div>
  );
}
