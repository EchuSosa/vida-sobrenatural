import Link from 'next/link';

export const metadata = {
  title: 'Bienvenida — Vida Sobrenatural',
};

export default function BienvenidaPage() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">
        ¡Bienvenido/a a Vida Sobrenatural!
      </h1>

      <p className="text-lg leading-7 text-zinc-700 dark:text-zinc-300">
        Si te acercaste por primera vez, esta es la Bienvenida: el primer paso de un proceso
        pensado para que puedas integrarte a la iglesia a tu propio ritmo, sin depender de
        preguntarle a alguien en persona ni de enterarte por WhatsApp o Instagram.
      </p>

      <section className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-5 dark:border-zinc-800">
        <h2 className="text-xl font-medium">¿Cómo sigue el proceso?</h2>
        <ol className="flex flex-col gap-2 text-zinc-700 dark:text-zinc-300">
          <li>
            <strong>1. Bienvenida</strong> — donde estás ahora: conocer la Sede y dar tu primer
            paso registrándote.
          </li>
          <li>
            <strong>2. Vida Nueva</strong> — un primer curso de acompañamiento.
          </li>
          <li>
            <strong>3. Vida de Servicio</strong> — el siguiente curso, con encuentros semanales.
          </li>
          <li>
            <strong>4. Ministerio</strong> — servir activamente en un área de la iglesia.
          </li>
        </ol>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Cada paso se habilita cuando corresponde — por ahora, lo único que necesitás hacer es
          conocer tu Sede y registrarte.
        </p>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/sede"
          className="flex h-11 items-center justify-center rounded-lg bg-zinc-900 px-5 text-center font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Ver información de mi Sede
        </Link>
        <Link
          href="/registro"
          className="flex h-11 items-center justify-center rounded-lg border border-zinc-300 px-5 text-center font-medium transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          Registrarme
        </Link>
      </div>
    </main>
  );
}
