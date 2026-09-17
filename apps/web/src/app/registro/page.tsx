'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import type { Genero, EstadoCivil, TiempoCongregacion, Sede } from '@vida-sobrenatural/shared-types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3333';

const OPCIONES_GENERO: { value: Genero; label: string }[] = [
  { value: 'femenino', label: 'Femenino' },
  { value: 'masculino', label: 'Masculino' },
];

const OPCIONES_ESTADO_CIVIL: { value: EstadoCivil; label: string }[] = [
  { value: 'soltero_a', label: 'Soltero/a' },
  { value: 'casado_a', label: 'Casado/a' },
  { value: 'en_concubinato', label: 'En concubinato' },
  { value: 'viudo_a', label: 'Viudo/a' },
  { value: 'divorciado_a', label: 'Divorciado/a' },
  { value: 'separado_a', label: 'Separado/a' },
];

const OPCIONES_TIEMPO_CONGREGACION: { value: TiempoCongregacion; label: string }[] = [
  { value: 'menos_6_meses', label: 'Menos de 6 meses' },
  { value: 'de_6_meses_a_1_anio', label: 'De 6 meses a 1 año' },
  { value: 'de_1_a_3_anios', label: 'De 1 a 3 años' },
  { value: 'de_3_a_5_anios', label: 'De 3 a 5 años' },
  { value: 'mas_5_anios', label: 'Más de 5 años' },
];

export default function RegistroPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [sedes, setSedes] = useState<Sede[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/sedes`)
      .then((r) => r.json())
      .then(setSedes)
      .catch(() => setError('No pudimos cargar las Sedes. Volvé a intentarlo más tarde.'));
  }, []);

  useEffect(() => {
    // FR-012 / edge case del spec: un Miembro registrado que ya está `activa`
    // no vuelve a ver el formulario — se lo saca de acá.
    if (session?.user.estado === 'activa') {
      router.replace('/bienvenida');
    }
    if (session?.user.estado === 'pendiente_tutor') {
      router.replace('/pendiente-tutor');
    }
  }, [session, router]);

  if (status === 'loading') {
    return <main className="mx-auto max-w-xl px-4 py-16">Cargando…</main>;
  }

  if (status === 'unauthenticated') {
    return (
      <main className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-16">
        <h1 className="text-2xl font-semibold">Registrarme</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Para registrarte, primero autorizá el acceso con tu cuenta de Google.
        </p>
        <button
          type="button"
          onClick={() => signIn('google', { callbackUrl: '/registro' })}
          className="flex h-11 w-fit items-center justify-center rounded-lg bg-zinc-900 px-5 font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900"
        >
          Continuar con Google
        </button>
      </main>
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setEnviando(true);

    const formData = new FormData(event.currentTarget);
    const body = Object.fromEntries(formData.entries());

    try {
      const response = await fetch(`${API_BASE_URL}/personas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.apiToken}`,
        },
        body: JSON.stringify({
          ...body,
          consentimientoDatos: formData.get('consentimientoDatos') === 'on',
          // Foto de perfil de Google — no es un campo del formulario, se toma
          // directo de la sesión (no editable por ahora).
          fotoUrl: session?.user.image ?? undefined,
        }),
      });

      if (response.status === 409) {
        setError('Ya existe una persona registrada con este email.');
        return;
      }
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setError(data?.message ?? 'No pudimos completar el registro. Revisá los datos.');
        return;
      }

      const resultado = await response.json();
      router.push(resultado.estado === 'activa' ? '/registro/listo' : '/pendiente-tutor');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-16">
      <h1 className="text-2xl font-semibold">Completá tus datos</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Ya autorizaste el acceso con {session?.user.email}. Faltan estos datos para terminar tu
        registro.
      </p>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Campo
          label="Apellido"
          name="apellido"
          required
          defaultValue={session?.user.familyName ?? ''}
        />
        <Campo
          label="Nombre"
          name="nombre"
          required
          defaultValue={session?.user.givenName ?? ''}
        />
        <CampoSelect label="Género" name="genero" required opciones={OPCIONES_GENERO} />
        <Campo label="Fecha de nacimiento" name="fechaNacimiento" type="date" required />
        <Campo label="Teléfono" name="telefono" required />
        <Campo label="Dirección" name="direccion" required />
        <CampoSelect
          label="Sede"
          name="sedeId"
          required
          opciones={sedes.map((s) => ({ value: s.id, label: s.nombre }))}
        />
        <CampoSelect
          label="Estado civil"
          name="estadoCivil"
          required
          opciones={OPCIONES_ESTADO_CIVIL}
        />
        <Campo label="Profesión" name="profesion" required />
        <CampoSelect
          label="Tiempo congregándote"
          name="tiempoCongregacion"
          required
          opciones={OPCIONES_TIEMPO_CONGREGACION}
        />

        <label className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
          <input type="checkbox" name="consentimientoDatos" className="mt-1" />
          Doy mi consentimiento para el almacenamiento de mis datos personales.
        </label>

        <button
          type="submit"
          disabled={enviando}
          className="flex h-11 items-center justify-center rounded-lg bg-zinc-900 px-5 font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
        >
          {enviando ? 'Enviando…' : 'Registrarme'}
        </button>
      </form>
    </main>
  );
}

function Campo({
  label,
  name,
  type = 'text',
  required,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium">
      {label}
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        className="h-10 rounded-md border border-zinc-300 px-3 text-sm font-normal dark:border-zinc-700 dark:bg-zinc-900"
      />
    </label>
  );
}

function CampoSelect({
  label,
  name,
  required,
  opciones,
}: {
  label: string;
  name: string;
  required?: boolean;
  opciones: { value: string; label: string }[];
}) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium">
      {label}
      <select
        name={name}
        required={required}
        defaultValue=""
        className="h-10 rounded-md border border-zinc-300 px-3 text-sm font-normal dark:border-zinc-700 dark:bg-zinc-900"
      >
        <option value="" disabled>
          Elegí una opción
        </option>
        {opciones.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
