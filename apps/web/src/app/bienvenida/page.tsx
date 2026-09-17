import Link from 'next/link';

export const metadata = {
  title: 'Bienvenida — Vida Sobrenatural',
};

export default function BienvenidaPage() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">
        Bienvenido/a a Vida Sobrenatural
      </h1>

      <p className="text-lg leading-7 text-zinc-700 dark:text-zinc-300">
        Somos una congregación en La Plata, Buenos Aires. Si te acercaste por primera vez, o hace
        poco empezaste a venir, esta página es para vos: acá vas a encontrar todo lo que
        necesitás saber, a tu propio ritmo, sin depender de preguntarle a alguien en persona o de
        enterarte por WhatsApp o Instagram.
      </p>

      <section className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-5 dark:border-zinc-800">
        <h2 className="text-xl font-medium">¿Cómo sigue el proceso?</h2>
        <p className="text-zinc-700 dark:text-zinc-300">
          A medida que te vayas sumando, vas a ir conociendo distintas etapas — no hay apuro, cada
          una se habilita cuando corresponde.
        </p>
        <ol className="flex flex-col gap-2 text-zinc-700 dark:text-zinc-300">
          <li>
            <strong>1. Bienvenida</strong> — donde estás ahora. Conocé la Sede, mirá los próximos
            eventos, y cuando quieras, registrate.
          </li>
          <li>
            <strong>2. Vida Nueva</strong> — tu primer paso de acompañamiento personal, con
            alguien de la iglesia que camina con vos.
          </li>
          <li>
            <strong>3. Vida de Servicio</strong> — un curso de 9 encuentros para seguir
            profundizando, en grupo.
          </li>
          <li>
            <strong>4. Ministerio</strong> — el momento de servir activamente en un área de la
            iglesia, con un equipo.
          </li>
        </ol>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          No hace falta que hagas nada de esto ya mismo. Por ahora, lo único que necesitás es
          conocer tu Sede y, si querés, registrarte.
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
