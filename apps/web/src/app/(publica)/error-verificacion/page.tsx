import Link from 'next/link';
import { ButtonLink } from '@vida-sobrenatural/ui';

export const metadata = {
  title: 'No pudimos verificar tu cuenta — Vida Sobrenatural',
};

export default function ErrorVerificacionPage() {
  return (
    // Sin <main id="contenido"> propio — (publica)/layout.tsx ya lo provee
    // (H-05, actualización 2026-09-18).
    <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-16">
      <h1 className="text-2xl font-semibold">No pudimos verificar tu cuenta</h1>
      <p className="text-muted-foreground">
        No pudimos verificar tu cuenta, probá de nuevo en un momento.
      </p>
      <ButtonLink render={<Link href="/registro" />} size="xl" className="w-fit">
        Reintentar
      </ButtonLink>
    </div>
  );
}
