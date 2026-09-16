import type { Sede } from '@vida-sobrenatural/shared-types';

export const metadata = {
  title: 'Nuestra Sede — Vida Sobrenatural',
};

async function getSedesActivas(): Promise<Sede[]> {
  const baseUrl = process.env.API_BASE_URL ?? 'http://localhost:3000';
  const response = await fetch(`${baseUrl}/sedes`, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`GET /sedes respondió ${response.status}`);
  }
  return response.json();
}

function SedeCard({ sede }: { sede: Sede }) {
  return (
    <article className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-5 dark:border-zinc-800">
      <h2 className="text-xl font-medium">{sede.nombre}</h2>
      <p className="text-zinc-700 dark:text-zinc-300">{sede.direccion}</p>
      <p className="text-zinc-700 dark:text-zinc-300">{sede.horarios}</p>
      {sede.contactoTelefono && (
        <p className="text-zinc-700 dark:text-zinc-300">Tel: {sede.contactoTelefono}</p>
      )}
      {sede.contactoEmail && (
        <p className="text-zinc-700 dark:text-zinc-300">Email: {sede.contactoEmail}</p>
      )}
      {sede.descripcionBienvenida && (
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">{sede.descripcionBienvenida}</p>
      )}
    </article>
  );
}

export default async function SedePage() {
  const sedes = await getSedesActivas();

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Nuestra Sede</h1>

      {sedes.length === 0 && (
        // Edge case del spec: todavía no hay ninguna Sede cargada por el Admin.
        <p className="text-zinc-600 dark:text-zinc-400">
          Todavía no cargamos la información de la Sede. Volvé a intentarlo más tarde.
        </p>
      )}

      {/* FR-002/FR-003: una única Sede activa se muestra directamente, sin selección. */}
      {sedes.length === 1 && <SedeCard sede={sedes[0]} />}

      {/* FR-004: más de una Sede activa — el Visitante identifica la suya. */}
      {sedes.length > 1 && (
        <div className="flex flex-col gap-4">
          <p className="text-zinc-600 dark:text-zinc-400">
            Elegí la Sede a la que te acercaste:
          </p>
          {sedes.map((sede) => (
            <SedeCard key={sede.id} sede={sede} />
          ))}
        </div>
      )}
    </main>
  );
}
