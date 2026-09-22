import Link from 'next/link';
import { ButtonLink } from '@vida-sobrenatural/ui';

export const metadata = {
  title: 'No pudimos confirmar tu email — Vida Sobrenatural',
};

/**
 * Distinta de /error-verificacion a propósito (FR-017, actualización
 * 2026-09-17): esto no es una falla transitoria de apps/api — es que el
 * proveedor SSO no confirmó el email como verificado, así que "reintentar en
 * un momento" no ayuda. Código del catálogo: EMAIL_NO_VERIFICADO.
 */
export default function EmailNoVerificadoPage() {
  return (
    // Sin <main id="contenido"> propio — (publica)/layout.tsx ya lo provee
    // (H-05, actualización 2026-09-18).
    <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-16">
      <h1 className="text-2xl font-semibold">No pudimos confirmar tu email</h1>
      <p className="text-muted-foreground">
        Tu proveedor de inicio de sesión no confirmó que tu email esté verificado, así que no
        podemos vincular tu cuenta. Verificá tu email con Google e intentá de nuevo, o escribinos
        a Secretaría si el problema sigue.
      </p>
      <ButtonLink render={<Link href="/registro" />} size="xl" className="w-fit">
        Reintentar
      </ButtonLink>
    </div>
  );
}
