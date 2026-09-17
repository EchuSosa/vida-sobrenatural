'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import type {
  Genero,
  EstadoCivil,
  Profesion,
  TiempoCongregacion,
  Sede,
} from '@vida-sobrenatural/shared-types';

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

const OPCIONES_PROFESION: { value: Profesion; label: string }[] = [
  { value: 'salud', label: 'Salud' },
  { value: 'educacion', label: 'Educación' },
  { value: 'tecnologia_ingenieria', label: 'Tecnología/Ingeniería' },
  { value: 'comercio_ventas', label: 'Comercio y Ventas' },
  { value: 'oficios_construccion', label: 'Oficios/Construcción' },
  { value: 'administracion_finanzas', label: 'Administración y Finanzas' },
  { value: 'legal', label: 'Legal' },
  { value: 'comunicacion_marketing', label: 'Comunicación y Marketing' },
  { value: 'arte_diseno', label: 'Arte y Diseño' },
  { value: 'servicios_gastronomia', label: 'Servicios y Gastronomía' },
  { value: 'transporte', label: 'Transporte' },
  { value: 'estudiante', label: 'Estudiante' },
  { value: 'ama_de_casa', label: 'Ama/o de casa' },
  { value: 'jubilado_a', label: 'Jubilado/a' },
  { value: 'sin_ocupacion', label: 'Sin ocupación' },
  { value: 'otro', label: 'Otro' },
];

const OPCIONES_CODIGO_PAIS = [
  { value: '+54', label: '+54 Argentina' },
  { value: '+598', label: '+598 Uruguay' },
  { value: '+595', label: '+595 Paraguay' },
  { value: '+591', label: '+591 Bolivia' },
  { value: '+56', label: '+56 Chile' },
  { value: '+55', label: '+55 Brasil' },
  { value: '+51', label: '+51 Perú' },
  { value: '+57', label: '+57 Colombia' },
  { value: '+58', label: '+58 Venezuela' },
  { value: '+52', label: '+52 México' },
  { value: '+34', label: '+34 España' },
  { value: '+1', label: '+1 Estados Unidos / Canadá' },
];

export default function RegistroPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [sedes, setSedes] = useState<Sede[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profesionSeleccionada, setProfesionSeleccionada] = useState('');

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
    const profesion = formData.get('profesion') as string;
    const codigoPais = formData.get('telefonoCodigoPais') as string;
    // Cinturón y tiras: el input ya filtra letras al tipear, esto limpia
    // cualquier cosa que igual haya llegado (pegado, autocompletado, etc.).
    const numero = (formData.get('telefonoNumero') as string).replace(/[^0-9]/g, '');

    const body = {
      apellido: formData.get('apellido'),
      nombre: formData.get('nombre'),
      genero: formData.get('genero'),
      fechaNacimiento: formData.get('fechaNacimiento'),
      telefono: `${codigoPais} ${numero}`,
      direccion: formData.get('direccion'),
      sedeId: formData.get('sedeId'),
      estadoCivil: formData.get('estadoCivil'),
      profesion,
      profesionDetalle: profesion === 'otro' ? formData.get('profesionDetalle') : undefined,
      tiempoCongregacion: formData.get('tiempoCongregacion'),
      consentimientoDatos: formData.get('consentimientoDatos') === 'on',
      // Foto de perfil de Google — no es un campo del formulario, se toma
      // directo de la sesión (no editable por ahora).
      fotoUrl: session?.user.image ?? undefined,
    };

    try {
      const response = await fetch(`${API_BASE_URL}/personas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.apiToken}`,
        },
        body: JSON.stringify(body),
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
        <CampoTelefono />
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
        <CampoSelect
          label="Profesión"
          name="profesion"
          required
          opciones={OPCIONES_PROFESION}
          onChange={setProfesionSeleccionada}
        />
        {profesionSeleccionada === 'otro' && (
          <Campo label="¿Cuál?" name="profesionDetalle" required />
        )}
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
  onChange,
}: {
  label: string;
  name: string;
  required?: boolean;
  opciones: { value: string; label: string }[];
  onChange?: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium">
      {label}
      <select
        name={name}
        required={required}
        defaultValue=""
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
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

function CampoTelefono() {
  return (
    <div className="flex flex-col gap-1 text-sm font-medium">
      Teléfono
      <div className="flex gap-2">
        <select
          name="telefonoCodigoPais"
          required
          defaultValue="+54"
          aria-label="Código de país"
          className="h-10 w-40 shrink-0 rounded-md border border-zinc-300 px-2 text-sm font-normal dark:border-zinc-700 dark:bg-zinc-900"
        >
          {OPCIONES_CODIGO_PAIS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <input
          name="telefonoNumero"
          type="tel"
          inputMode="numeric"
          required
          aria-label="Número de teléfono"
          placeholder="Solo números"
          onChange={(e) => {
            // No debe aceptar letras — se filtra apenas se tipea, no solo al enviar.
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
          }}
          className="h-10 flex-1 rounded-md border border-zinc-300 px-3 text-sm font-normal dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>
    </div>
  );
}
