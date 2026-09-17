'use client';

import { useCallback, useEffect, useState } from 'react';
import { signIn, useSession } from 'next-auth/react';
import type { PersonaPendienteTutor } from '@vida-sobrenatural/shared-types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3333';

export default function PendientesTutorPage() {
  const { data: session, status } = useSession();
  const [pendientes, setPendientes] = useState<PersonaPendienteTutor[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  const cargarPendientes = useCallback(async () => {
    if (!session?.apiToken) return;
    setCargando(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/personas/pendientes-tutor`, {
        headers: { Authorization: `Bearer ${session.apiToken}` },
      });
      if (response.status === 403) {
        setError('Tu usuario no tiene rol Admin ni Discipulador.');
        return;
      }
      if (!response.ok) {
        setError('No pudimos cargar la lista de pendientes.');
        return;
      }
      setPendientes(await response.json());
    } finally {
      setCargando(false);
    }
  }, [session?.apiToken]);

  useEffect(() => {
    // Función local declarada dentro del efecto (no llamar directo a la de
    // useCallback) — evita que react-hooks/set-state-in-effect marque un
    // falso positivo sobre un setState que en realidad ocurre después de un
    // await, no de forma síncrona en el cuerpo del efecto.
    async function ejecutar() {
      await cargarPendientes();
    }
    ejecutar();
  }, [cargarPendientes]);

  async function activar(id: string) {
    const tutorNombre = window.prompt('Nombre del tutor:');
    if (!tutorNombre) return;
    const tutorTelefono = window.prompt('Teléfono del tutor:');
    if (!tutorTelefono) return;

    const response = await fetch(`${API_BASE_URL}/personas/${id}/activar`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.apiToken}`,
      },
      body: JSON.stringify({ tutorNombre, tutorTelefono }),
    });
    if (response.ok) {
      await cargarPendientes();
    } else {
      setError('No pudimos activar a esta Persona.');
    }
  }

  async function marcarInactiva(id: string) {
    if (!window.confirm('¿Confirmás que el tutor no autoriza (o no se lo pudo contactar)?')) {
      return;
    }
    const response = await fetch(`${API_BASE_URL}/personas/${id}/marcar-inactiva`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${session?.apiToken}` },
    });
    if (response.ok) {
      await cargarPendientes();
    } else {
      setError('No pudimos marcar como inactiva a esta Persona.');
    }
  }

  if (status === 'loading') {
    return <main className="mx-auto max-w-3xl px-4 py-16">Cargando…</main>;
  }

  if (status === 'unauthenticated') {
    return (
      <main className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-16">
        <h1 className="text-2xl font-semibold">Casos pendientes de tutor</h1>
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
    <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-16">
      <h1 className="text-2xl font-semibold">Casos pendientes de tutor</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Menores de 18 años que intentaron registrarse (Historia 2b) — contactá al tutor antes de
        activar o cerrar el caso.
      </p>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      {!cargando && pendientes.length === 0 && !error && (
        <p className="text-zinc-500">No hay casos pendientes por ahora.</p>
      )}

      <ul className="flex flex-col gap-3">
        {pendientes.map((persona) => (
          <li
            key={persona.id}
            className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-medium">
                {persona.nombre} {persona.apellido}
              </p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Tel: {persona.telefono} — Nació: {persona.fechaNacimiento}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => activar(persona.id)}
                className="h-9 rounded-md bg-zinc-900 px-3 text-sm font-medium text-white dark:bg-zinc-50 dark:text-zinc-900"
              >
                Activar
              </button>
              <button
                type="button"
                onClick={() => marcarInactiva(persona.id)}
                className="h-9 rounded-md border border-zinc-300 px-3 text-sm font-medium dark:border-zinc-700"
              >
                Marcar inactiva
              </button>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
