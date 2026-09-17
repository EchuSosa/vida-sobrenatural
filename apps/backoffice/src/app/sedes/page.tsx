'use client';

import { useCallback, useEffect, useState } from 'react';
import { signIn, useSession } from 'next-auth/react';
import type { Sede } from '@vida-sobrenatural/shared-types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3333';

export default function SedesPage() {
  const { data: session, status } = useSession();
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sinPermiso, setSinPermiso] = useState(false);

  const cargarSedes = useCallback(async () => {
    const response = await fetch(`${API_BASE_URL}/sedes`);
    if (response.ok) setSedes(await response.json());
  }, []);

  useEffect(() => {
    // Función local declarada dentro del efecto (no llamar directo a la de
    // useCallback) — evita que react-hooks/set-state-in-effect marque un
    // falso positivo sobre un setState que en realidad ocurre después de un
    // await, no de forma síncrona en el cuerpo del efecto.
    async function ejecutar() {
      await cargarSedes();
    }
    ejecutar();
  }, [cargarSedes]);

  async function crearSede(formData: FormData) {
    setError(null);
    setSinPermiso(false);
    const body = Object.fromEntries(formData.entries());
    const response = await fetch(`${API_BASE_URL}/sedes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.apiToken}` },
      body: JSON.stringify(body),
    });
    if (response.status === 403) {
      setSinPermiso(true);
      return;
    }
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.message ?? 'No pudimos crear la Sede.');
      return;
    }
    await cargarSedes();
  }

  async function actualizarSede(id: string, cambios: Record<string, unknown>) {
    setError(null);
    setSinPermiso(false);
    const response = await fetch(`${API_BASE_URL}/sedes/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.apiToken}` },
      body: JSON.stringify(cambios),
    });
    if (response.status === 403) {
      setSinPermiso(true);
      return;
    }
    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.message ?? 'No pudimos actualizar la Sede.');
      return;
    }
    await cargarSedes();
  }

  if (status === 'loading') {
    return <main className="mx-auto max-w-3xl px-4 py-16">Cargando…</main>;
  }

  if (status === 'unauthenticated') {
    return (
      <main className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-16">
        <h1 className="text-2xl font-semibold">Gestión de Sede</h1>
        <button
          type="button"
          onClick={() => signIn('google')}
          className="flex h-11 w-fit items-center justify-center rounded-lg bg-zinc-900 px-5 font-medium text-white dark:bg-zinc-50 dark:text-zinc-900"
        >
          Continuar con Google
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-16">
      <h1 className="text-2xl font-semibold">Gestión de Sede</h1>

      {sinPermiso && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          Tu usuario no tiene rol Admin — no podés crear ni editar Sedes.
        </p>
      )}
      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Sedes activas</h2>
        {sedes.length === 0 && <p className="text-zinc-500">Todavía no hay Sedes cargadas.</p>}
        {sedes.map((sede) => (
          <article key={sede.id} className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <p className="font-medium">{sede.nombre}</p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{sede.direccion}</p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{sede.horarios}</p>
            <button
              type="button"
              onClick={() => actualizarSede(sede.id, { activo: false })}
              className="mt-2 h-9 w-fit rounded-md border border-red-300 px-3 text-sm font-medium text-red-700 dark:border-red-800 dark:text-red-400"
            >
              Desactivar
            </button>
          </article>
        ))}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Crear nueva Sede</h2>
        <form
          action={(formData) => {
            crearSede(formData);
          }}
          className="flex flex-col gap-3"
        >
          <input name="nombre" placeholder="Nombre" required className="h-10 rounded-md border border-zinc-300 px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
          <input name="direccion" placeholder="Dirección" required className="h-10 rounded-md border border-zinc-300 px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
          <input name="horarios" placeholder="Horarios" required className="h-10 rounded-md border border-zinc-300 px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
          <input name="contactoTelefono" placeholder="Teléfono de contacto" className="h-10 rounded-md border border-zinc-300 px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
          <input name="contactoEmail" placeholder="Email de contacto" className="h-10 rounded-md border border-zinc-300 px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
          <textarea name="descripcionBienvenida" placeholder="Descripción para la Bienvenida (opcional)" className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" />
          <button type="submit" className="h-10 w-fit rounded-md bg-zinc-900 px-4 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-900">
            Crear Sede
          </button>
        </form>
      </section>
    </main>
  );
}
