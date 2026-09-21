import Link from 'next/link';
import { buttonVariants } from '@vida-sobrenatural/ui';

export function ContenidoRegistroListo() {
  // Sin <main id="contenido"> propio — (publica)/layout.tsx ya lo provee
  // (H-05, actualización 2026-09-18).
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-16">
      <h1 className="text-2xl font-semibold">¡Listo, ya sos parte!</h1>
      <p className="text-muted-foreground">
        Tu registro se completó. Ya podés volver a iniciar sesión con tu cuenta de Google cuando
        quieras.
      </p>
      {/*
        FR-012: esta pantalla NO enlaza a Vida Nueva, Vida de Servicio ni
        Ministerio — esos pasos pertenecen a fases posteriores del proceso de
        integración, fuera del alcance de la Fase de Bienvenida.
      */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link href="/" className={buttonVariants({ size: 'xl' })}>
          Ir a Inicio
        </Link>
        <Link href="/primeros-pasos" className={buttonVariants({ variant: 'outline', size: 'xl' })}>
          Volver a Primeros pasos
        </Link>
      </div>
    </div>
  );
}
