import Link from 'next/link';

export const metadata = {
  title: 'Vida Sobrenatural — La Plata',
  description:
    'Iglesia Vida Sobrenatural en La Plata, Buenos Aires. Enterate cómo son los primeros pasos y visitanos.',
};

export default function InicioPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Vida Sobrenatural — La Plata</h1>
      <p className="text-lg leading-7 text-zinc-700 dark:text-zinc-300">
        Nos alegra que estés acá. Si te acercaste por primera vez, o hace poco empezaste a venir,
        arrancá por Primeros pasos.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/primeros-pasos"
          className="flex h-11 items-center justify-center rounded-lg bg-primary px-5 text-center font-medium text-primary-foreground transition-colors hover:bg-primary/80"
        >
          Ver primeros pasos
        </Link>
        <Link
          href="/visitanos"
          className="flex h-11 items-center justify-center rounded-lg border border-border px-5 text-center font-medium transition-colors hover:bg-muted"
        >
          Visitanos
        </Link>
      </div>
    </div>
  );
}
