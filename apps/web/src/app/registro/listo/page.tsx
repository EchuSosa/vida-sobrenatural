import Link from 'next/link';

export const metadata = {
  title: 'Registro completo — Vida Sobrenatural',
};

export default function RegistroListoPage() {
  return (
    <main id="contenido" className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-16">
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
      <Link
        href="/primeros-pasos"
        className="flex h-11 w-fit items-center justify-center rounded-lg border border-zinc-300 px-5 font-medium transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
      >
        Volver a Primeros pasos
      </Link>
    </main>
  );
}
