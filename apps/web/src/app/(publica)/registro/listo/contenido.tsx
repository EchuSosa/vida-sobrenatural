import Link from 'next/link';

export function ContenidoRegistroListo() {
  // Sin <main id="contenido"> propio — (publica)/layout.tsx ya lo provee
  // (H-05, actualización 2026-09-18).
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-16">
      <h1 className="text-2xl font-semibold">¡Listo, ya sos parte!</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Tu registro se completó. Ya podés volver a iniciar sesión con tu cuenta de Google cuando
        quieras.
      </p>
      {/*
        FR-012: esta pantalla NO enlaza a Vida Nueva, Vida de Servicio ni
        Ministerio — esos pasos pertenecen a fases posteriores del proceso de
        integración, fuera del alcance de la Fase de Bienvenida.
      */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/"
          className="flex h-11 items-center justify-center rounded-lg bg-primary px-5 font-medium text-primary-foreground transition-colors hover:bg-primary/80"
        >
          Ir a Inicio
        </Link>
        <Link
          href="/primeros-pasos"
          className="flex h-11 items-center justify-center rounded-lg border border-zinc-300 px-5 font-medium transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          Volver a Primeros pasos
        </Link>
      </div>
    </div>
  );
}
