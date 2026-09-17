'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import type {
  Genero,
  EstadoCivil,
  Profesion,
  TiempoCongregacion,
  Sede,
} from '@vida-sobrenatural/shared-types';
import { apiFetch, ApiError } from '../../lib/api-client';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3333';

/**
 * Las listas predefinidas se guardan como claves estables (los mismos
 * valores que Prisma/class-validator ya usan) y se traducen recién acá, al
 * mostrarse — FR-032 (specs/002-base-transversal, Historia 6).
 */
function useOpcionesRegistro() {
  const t = useTranslations('registro.opciones');

  const genero: { value: Genero; label: string }[] = [
    { value: 'femenino', label: t('genero.femenino') },
    { value: 'masculino', label: t('genero.masculino') },
  ];

  const estadoCivil: { value: EstadoCivil; label: string }[] = [
    { value: 'soltero_a', label: t('estadoCivil.soltero_a') },
    { value: 'casado_a', label: t('estadoCivil.casado_a') },
    { value: 'en_concubinato', label: t('estadoCivil.en_concubinato') },
    { value: 'viudo_a', label: t('estadoCivil.viudo_a') },
    { value: 'divorciado_a', label: t('estadoCivil.divorciado_a') },
    { value: 'separado_a', label: t('estadoCivil.separado_a') },
  ];

  const tiempoCongregacion: { value: TiempoCongregacion; label: string }[] = [
    { value: 'menos_6_meses', label: t('tiempoCongregacion.menos_6_meses') },
    { value: 'de_6_meses_a_1_anio', label: t('tiempoCongregacion.de_6_meses_a_1_anio') },
    { value: 'de_1_a_3_anios', label: t('tiempoCongregacion.de_1_a_3_anios') },
    { value: 'de_3_a_5_anios', label: t('tiempoCongregacion.de_3_a_5_anios') },
    { value: 'mas_5_anios', label: t('tiempoCongregacion.mas_5_anios') },
  ];

  const profesion: { value: Profesion; label: string }[] = [
    { value: 'salud', label: t('profesion.salud') },
    { value: 'educacion', label: t('profesion.educacion') },
    { value: 'tecnologia_ingenieria', label: t('profesion.tecnologia_ingenieria') },
    { value: 'comercio_ventas', label: t('profesion.comercio_ventas') },
    { value: 'oficios_construccion', label: t('profesion.oficios_construccion') },
    { value: 'administracion_finanzas', label: t('profesion.administracion_finanzas') },
    { value: 'legal', label: t('profesion.legal') },
    { value: 'comunicacion_marketing', label: t('profesion.comunicacion_marketing') },
    { value: 'arte_diseno', label: t('profesion.arte_diseno') },
    { value: 'servicios_gastronomia', label: t('profesion.servicios_gastronomia') },
    { value: 'transporte', label: t('profesion.transporte') },
    { value: 'estudiante', label: t('profesion.estudiante') },
    { value: 'ama_de_casa', label: t('profesion.ama_de_casa') },
    { value: 'jubilado_a', label: t('profesion.jubilado_a') },
    { value: 'sin_ocupacion', label: t('profesion.sin_ocupacion') },
    { value: 'otro', label: t('profesion.otro') },
  ];

  return { genero, estadoCivil, tiempoCongregacion, profesion };
}

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
  const t = useTranslations('errors');
  const opciones = useOpcionesRegistro();

  const [sedes, setSedes] = useState<Sede[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [erroresPorCampo, setErroresPorCampo] = useState<Record<string, boolean>>({});
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
      router.replace('/primeros-pasos');
    }
    if (session?.user.estado === 'pendiente_tutor') {
      router.replace('/pendiente-tutor');
    }
  }, [session, router]);

  if (status === 'loading') {
    return <main id="contenido" className="mx-auto max-w-xl px-4 py-16">Cargando…</main>;
  }

  if (status === 'unauthenticated') {
    return (
      <main id="contenido" className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-16">
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
    setErroresPorCampo({});
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
      const resultado = await apiFetch<{ id: string; estado: string }>('/personas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.apiToken}`,
        },
        body: JSON.stringify(body),
      });
      router.push(resultado.estado === 'activa' ? '/registro/listo' : '/pendiente-tutor');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(t(err.code));
        if (err.errors?.length) {
          setErroresPorCampo(Object.fromEntries(err.errors.map((e) => [e.campo, true])));
        }
      } else {
        setError(t('ERROR_INTERNO'));
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main id="contenido" className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-16">
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
          error={erroresPorCampo.apellido}
        />
        <Campo
          label="Nombre"
          name="nombre"
          required
          defaultValue={session?.user.givenName ?? ''}
          error={erroresPorCampo.nombre}
        />
        <CampoSelect
          label="Género"
          name="genero"
          required
          opciones={opciones.genero}
          error={erroresPorCampo.genero}
        />
        <Campo
          label="Fecha de nacimiento"
          name="fechaNacimiento"
          type="date"
          required
          error={erroresPorCampo.fechaNacimiento}
        />
        <CampoTelefono error={erroresPorCampo.telefono} />
        <Campo label="Dirección" name="direccion" required error={erroresPorCampo.direccion} />
        <CampoSelect
          label="Sede"
          name="sedeId"
          required
          opciones={sedes.map((s) => ({ value: s.id, label: s.nombre }))}
          error={erroresPorCampo.sedeId}
        />
        <CampoSelect
          label="Estado civil"
          name="estadoCivil"
          required
          opciones={opciones.estadoCivil}
          error={erroresPorCampo.estadoCivil}
        />
        <CampoSelect
          label="Profesión"
          name="profesion"
          required
          opciones={opciones.profesion}
          onChange={setProfesionSeleccionada}
          error={erroresPorCampo.profesion}
        />
        {profesionSeleccionada === 'otro' && (
          <Campo
            label="¿Cuál?"
            name="profesionDetalle"
            required
            error={erroresPorCampo.profesionDetalle}
          />
        )}
        <CampoSelect
          label="Tiempo congregándote"
          name="tiempoCongregacion"
          required
          opciones={opciones.tiempoCongregacion}
          error={erroresPorCampo.tiempoCongregacion}
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
  error,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  error?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium">
      {label}
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        aria-invalid={error || undefined}
        aria-describedby={error ? `${name}-error` : undefined}
        className="h-10 rounded-md border border-zinc-300 px-3 text-sm font-normal aria-invalid:border-destructive dark:border-zinc-700 dark:bg-zinc-900"
      />
      {error && (
        <span id={`${name}-error`} className="text-sm font-normal text-destructive">
          Revisá este dato.
        </span>
      )}
    </label>
  );
}

function CampoSelect({
  label,
  name,
  required,
  opciones,
  onChange,
  error,
}: {
  label: string;
  name: string;
  required?: boolean;
  opciones: { value: string; label: string }[];
  onChange?: (value: string) => void;
  error?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium">
      {label}
      <select
        name={name}
        required={required}
        defaultValue=""
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        aria-invalid={error || undefined}
        aria-describedby={error ? `${name}-error` : undefined}
        className="h-10 rounded-md border border-zinc-300 px-3 text-sm font-normal aria-invalid:border-destructive dark:border-zinc-700 dark:bg-zinc-900"
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
      {error && (
        <span id={`${name}-error`} className="text-sm font-normal text-destructive">
          Revisá este dato.
        </span>
      )}
    </label>
  );
}

function CampoTelefono({ error }: { error?: boolean }) {
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
          aria-invalid={error || undefined}
          placeholder="Solo números"
          onChange={(e) => {
            // No debe aceptar letras — se filtra apenas se tipea, no solo al enviar.
            e.target.value = e.target.value.replace(/[^0-9]/g, '');
          }}
          className="h-10 flex-1 rounded-md border border-zinc-300 px-3 text-sm font-normal aria-invalid:border-destructive dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>
      {error && <span className="text-sm font-normal text-destructive">Revisá este dato.</span>}
    </div>
  );
}
