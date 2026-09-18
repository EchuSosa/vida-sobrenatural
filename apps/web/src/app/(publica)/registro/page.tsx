'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
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
import { PasoIndicador } from '@vida-sobrenatural/ui';
import { apiFetch, ApiError } from '../../../lib/api-client';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3333';
const TOTAL_PASOS = 4;
const EDAD_MINIMA = 18;

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

interface DatosFormulario {
  apellido: string;
  nombre: string;
  genero: string;
  fechaNacimiento: string;
  telefonoCodigoPais: string;
  telefonoNumero: string;
  direccion: string;
  sedeId: string;
  estadoCivil: string;
  profesion: string;
  profesionDetalle: string;
  tiempoCongregacion: string;
  consentimientoDatos: boolean;
}

function calcularEdadAproximada(fechaNacimiento: string): number | null {
  if (!fechaNacimiento) return null;
  const nacimiento = new Date(fechaNacimiento);
  if (Number.isNaN(nacimiento.getTime())) return null;
  const hoy = new Date();
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const noCumplioTodavia =
    hoy.getMonth() < nacimiento.getMonth() ||
    (hoy.getMonth() === nacimiento.getMonth() && hoy.getDate() < nacimiento.getDate());
  if (noCumplioTodavia) edad -= 1;
  return edad;
}

export default function RegistroPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const t = useTranslations('registro');
  const tErrores = useTranslations('errors');
  const opciones = useOpcionesRegistro();
  const encabezadoRef = useRef<HTMLHeadingElement>(null);
  // H-19/H-16 (actualización 2026-09-18): update() tras un registro exitoso
  // dispara un re-render con session.user.estado ya "activa", que compite
  // con el useEffect de abajo (pensado para quien entra a /registro ya
  // activa de antes) — esta ref evita que ese efecto redirija a Primeros
  // pasos justo cuando handleSubmit ya está navegando a /registro/listo.
  const acabamosDeRegistrarRef = useRef(false);

  const [sedes, setSedes] = useState<Sede[]>([]);
  const [paso, setPaso] = useState(1);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [erroresPorCampo, setErroresPorCampo] = useState<Record<string, boolean>>({});
  const [datos, setDatos] = useState<DatosFormulario>({
    apellido: '',
    nombre: '',
    genero: '',
    fechaNacimiento: '',
    telefonoCodigoPais: '+54',
    telefonoNumero: '',
    direccion: '',
    sedeId: '',
    estadoCivil: '',
    profesion: '',
    profesionDetalle: '',
    tiempoCongregacion: '',
    consentimientoDatos: false,
  });

  useEffect(() => {
    fetch(`${API_BASE_URL}/sedes`)
      .then((r) => r.json())
      .then(setSedes)
      .catch(() => setError('No pudimos cargar las Sedes. Volvé a intentarlo más tarde.'));
  }, []);

  useEffect(() => {
    // FR-012 / edge case del spec: un Miembro registrado que ya está `activa`
    // no vuelve a ver el formulario — se lo saca de acá. H-16 (actualización
    // 2026-09-18): el ?ya_registrado=1 hace que Primeros pasos avise por qué
    // (AvisoPorQuery), en vez de un salto silencioso.
    if (session?.user.estado === 'activa' && !acabamosDeRegistrarRef.current) {
      router.replace('/primeros-pasos?ya_registrado=1');
    }
    if (session?.user.estado === 'pendiente_tutor') {
      router.replace('/pendiente-tutor');
    }
  }, [session, router]);

  useEffect(() => {
    // FR-016: mover el foco al título del paso nuevo — orden de tabulación y
    // foco predecibles para quien navega con teclado/lector de pantalla
    // (Constitución Principio VII).
    encabezadoRef.current?.focus();
  }, [paso]);

  // Apellido/Nombre se precompletan desde el perfil de Google (editable) sin
  // necesitar un efecto: mientras la persona no haya tocado el campo, se
  // muestra (y se envía) el valor de la sesión — ajuste durante el render,
  // no un setState en un efecto (evita cascading renders innecesarios).
  const apellidoEfectivo = datos.apellido || session?.user.familyName || '';
  const nombreEfectivo = datos.nombre || session?.user.givenName || '';

  // Sin <main id="contenido"> propio: apps/web/src/app/(publica)/layout.tsx
  // ya provee ese landmark desde que esta página se movió ahí (H-05,
  // actualización 2026-09-18) — tenerlo acá también duplicaba el <main>.
  if (status === 'loading') {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        {t('cargando')}
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-16">
        <h1 className="text-2xl font-semibold">{t('tituloNoAutenticado')}</h1>
        <p className="text-zinc-600 dark:text-zinc-400">{t('textoNoAutenticado')}</p>
        <button
          type="button"
          onClick={() => signIn('google', { callbackUrl: '/registro' })}
          className="flex h-11 w-fit items-center justify-center rounded-lg bg-zinc-900 px-5 font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900"
        >
          {t('botones.continuarGoogle')}
        </button>
      </div>
    );
  }

  function actualizar<K extends keyof DatosFormulario>(campo: K, valor: DatosFormulario[K]) {
    setDatos((prev) => ({ ...prev, [campo]: valor }));
    if (erroresPorCampo[campo]) {
      setErroresPorCampo((prev) => ({ ...prev, [campo]: false }));
    }
  }

  function pasoValido(numeroPaso: number): boolean {
    if (numeroPaso === 1) {
      return Boolean(
        apellidoEfectivo && nombreEfectivo && datos.genero && datos.fechaNacimiento,
      );
    }
    if (numeroPaso === 2) {
      return Boolean(datos.telefonoNumero && datos.direccion && datos.sedeId);
    }
    if (numeroPaso === 3) {
      const detalleOk = datos.profesion !== 'otro' || Boolean(datos.profesionDetalle);
      return Boolean(datos.estadoCivil && datos.profesion && datos.tiempoCongregacion && detalleOk);
    }
    return true;
  }

  function siguiente() {
    if (!pasoValido(paso)) {
      // Marca los campos vacíos del paso actual sin llamar a la API todavía.
      setErroresPorCampo((prev) => ({ ...prev, ...camposVaciosDelPaso(paso) }));
      return;
    }
    setPaso((p) => Math.min(p + 1, TOTAL_PASOS));
  }

  function atras() {
    setPaso((p) => Math.max(p - 1, 1));
  }

  function camposVaciosDelPaso(numeroPaso: number): Record<string, boolean> {
    if (numeroPaso === 1) {
      return {
        apellido: !apellidoEfectivo,
        nombre: !nombreEfectivo,
        genero: !datos.genero,
        fechaNacimiento: !datos.fechaNacimiento,
      };
    }
    if (numeroPaso === 2) {
      return {
        telefono: !datos.telefonoNumero,
        direccion: !datos.direccion,
        sedeId: !datos.sedeId,
      };
    }
    return {
      estadoCivil: !datos.estadoCivil,
      profesion: !datos.profesion,
      profesionDetalle: datos.profesion === 'otro' && !datos.profesionDetalle,
      tiempoCongregacion: !datos.tiempoCongregacion,
    };
  }

  const edadAproximada = calcularEdadAproximada(datos.fechaNacimiento);
  const esProbablementeMayorDeEdad = edadAproximada === null || edadAproximada >= EDAD_MINIMA;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setEnviando(true);

    const body = {
      apellido: apellidoEfectivo,
      nombre: nombreEfectivo,
      genero: datos.genero,
      fechaNacimiento: datos.fechaNacimiento,
      telefono: `${datos.telefonoCodigoPais} ${datos.telefonoNumero}`,
      direccion: datos.direccion,
      sedeId: datos.sedeId,
      estadoCivil: datos.estadoCivil,
      profesion: datos.profesion,
      profesionDetalle: datos.profesion === 'otro' ? datos.profesionDetalle : undefined,
      tiempoCongregacion: datos.tiempoCongregacion,
      consentimientoDatos: datos.consentimientoDatos,
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
      if (resultado.estado === 'activa') {
        acabamosDeRegistrarRef.current = true;
        // H-19 (actualización 2026-09-18): refresca la sesión ANTES de
        // navegar, para que el menú público y el resto de la app ya vean
        // estado: activa sin esperar un nuevo login (jwt callback en
        // auth.ts vuelve a resolver contra apps/api en cualquier update()).
        // OJO: update() SIN argumentos hace un simple GET /api/auth/session
        // (no dispara trigger: "update" en el callback jwt) — hay que pasar
        // un objeto, aunque sea vacío, para que next-auth lo mande por POST.
        await update({});
        // H-15: marca que se acaba de completar el registro EN ESTE tab —
        // /registro/listo (Server Component) lo exige para no mostrar una
        // confirmación falsa a quien entra directo por URL.
        window.sessionStorage.setItem('registroRecienCompletado', '1');
        router.push('/registro/listo');
      } else {
        router.push('/pendiente-tutor');
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(tErrores(err.code));
        if (err.errors?.length) {
          setErroresPorCampo(Object.fromEntries(err.errors.map((e) => [e.campo, true])));
        }
      } else {
        setError(tErrores('ERROR_INTERNO'));
      }
    } finally {
      setEnviando(false);
    }
  }

  const tituloPaso = t(`tituloPaso${paso}` as 'tituloPaso1');

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-16">
      <h1 className="text-2xl font-semibold">{t('tituloPagina')}</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        {t('introPagina', { email: session?.user.email ?? '' })}
      </p>

      <PasoIndicador
        actual={paso}
        total={TOTAL_PASOS}
        etiqueta={t('paso', { actual: paso, total: TOTAL_PASOS })}
        nombrePaso={tituloPaso}
      />

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <form
        onSubmit={paso === TOTAL_PASOS ? handleSubmit : (e) => e.preventDefault()}
        className="flex flex-col gap-4"
      >
        {/* tabIndex -1 + focus programático (arriba) — anuncia el paso nuevo sin robar el foco de un click real. */}
        <h2 ref={encabezadoRef} tabIndex={-1} className="text-lg font-medium outline-none">
          {tituloPaso}
        </h2>

        {paso === 1 && (
          <>
            <Campo
              label={t('campos.apellido')}
              name="apellido"
              required
              value={apellidoEfectivo}
              onChange={(v) => actualizar('apellido', v)}
              error={erroresPorCampo.apellido}
              errorTexto={t('errorCampo')}
            />
            <Campo
              label={t('campos.nombre')}
              name="nombre"
              required
              value={nombreEfectivo}
              onChange={(v) => actualizar('nombre', v)}
              error={erroresPorCampo.nombre}
              errorTexto={t('errorCampo')}
            />
            <CampoSelect
              label={t('campos.genero')}
              name="genero"
              required
              opciones={opciones.genero}
              value={datos.genero}
              onChange={(v) => actualizar('genero', v)}
              error={erroresPorCampo.genero}
              errorTexto={t('errorCampo')}
              placeholder={t('elegirOpcion')}
            />
            <Campo
              label={t('campos.fechaNacimiento')}
              name="fechaNacimiento"
              type="date"
              required
              value={datos.fechaNacimiento}
              onChange={(v) => actualizar('fechaNacimiento', v)}
              error={erroresPorCampo.fechaNacimiento}
              errorTexto={t('errorCampo')}
            />
          </>
        )}

        {paso === 2 && (
          <>
            <CampoTelefono
              labelTelefono={t('campos.numeroTelefono')}
              labelCodigo={t('campos.codigoPais')}
              codigoPais={datos.telefonoCodigoPais}
              numero={datos.telefonoNumero}
              onChangeCodigo={(v) => actualizar('telefonoCodigoPais', v)}
              onChangeNumero={(v) => actualizar('telefonoNumero', v)}
              error={erroresPorCampo.telefono}
              errorTexto={t('errorCampo')}
              placeholderNumero={t('soloNumeros')}
            />
            <Campo
              label={t('campos.direccion')}
              name="direccion"
              required
              value={datos.direccion}
              onChange={(v) => actualizar('direccion', v)}
              error={erroresPorCampo.direccion}
              errorTexto={t('errorCampo')}
            />
            <CampoSelect
              label={t('campos.sede')}
              name="sedeId"
              required
              opciones={sedes.map((s) => ({ value: s.id, label: s.nombre }))}
              value={datos.sedeId}
              onChange={(v) => actualizar('sedeId', v)}
              error={erroresPorCampo.sedeId}
              errorTexto={t('errorCampo')}
              placeholder={t('elegirOpcion')}
            />
          </>
        )}

        {paso === 3 && (
          <>
            <CampoSelect
              label={t('campos.estadoCivil')}
              name="estadoCivil"
              required
              opciones={opciones.estadoCivil}
              value={datos.estadoCivil}
              onChange={(v) => actualizar('estadoCivil', v)}
              error={erroresPorCampo.estadoCivil}
              errorTexto={t('errorCampo')}
              placeholder={t('elegirOpcion')}
            />
            <CampoSelect
              label={t('campos.profesion')}
              name="profesion"
              required
              opciones={opciones.profesion}
              value={datos.profesion}
              onChange={(v) => actualizar('profesion', v)}
              error={erroresPorCampo.profesion}
              errorTexto={t('errorCampo')}
              placeholder={t('elegirOpcion')}
            />
            {datos.profesion === 'otro' && (
              <Campo
                label={t('campos.profesionDetalle')}
                name="profesionDetalle"
                required
                value={datos.profesionDetalle}
                onChange={(v) => actualizar('profesionDetalle', v)}
                error={erroresPorCampo.profesionDetalle}
                errorTexto={t('errorCampo')}
              />
            )}
            <CampoSelect
              label={t('campos.tiempoCongregacion')}
              name="tiempoCongregacion"
              required
              opciones={opciones.tiempoCongregacion}
              value={datos.tiempoCongregacion}
              onChange={(v) => actualizar('tiempoCongregacion', v)}
              error={erroresPorCampo.tiempoCongregacion}
              errorTexto={t('errorCampo')}
              placeholder={t('elegirOpcion')}
            />
          </>
        )}

        {paso === 4 && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{t('resumenIntro')}</p>
            <ResumenDatos
              datos={{ ...datos, apellido: apellidoEfectivo, nombre: nombreEfectivo }}
              opciones={opciones}
              sedes={sedes}
              t={t}
              onEditar={setPaso}
            />

            {esProbablementeMayorDeEdad && (
              <label className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                <input
                  type="checkbox"
                  checked={datos.consentimientoDatos}
                  onChange={(e) => actualizar('consentimientoDatos', e.target.checked)}
                  className="mt-1"
                />
                {t('campos.consentimiento')}
              </label>
            )}
          </div>
        )}

        <div className="flex gap-3">
          {paso > 1 && (
            <button
              type="button"
              onClick={atras}
              className="flex h-11 items-center justify-center rounded-lg border border-zinc-300 px-5 font-medium transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
            >
              {t('botones.atras')}
            </button>
          )}
          {paso < TOTAL_PASOS && (
            <button
              type="button"
              onClick={siguiente}
              className="flex h-11 items-center justify-center rounded-lg bg-zinc-900 px-5 font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900"
            >
              {t('botones.siguiente')}
            </button>
          )}
          {paso === TOTAL_PASOS && (
            <button
              type="submit"
              disabled={enviando}
              className="flex h-11 items-center justify-center rounded-lg bg-zinc-900 px-5 font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
            >
              {enviando ? t('botones.enviando') : t('botones.enviar')}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

function ResumenDatos({
  datos,
  opciones,
  sedes,
  t,
  onEditar,
}: {
  datos: DatosFormulario;
  opciones: ReturnType<typeof useOpcionesRegistro>;
  sedes: Sede[];
  t: ReturnType<typeof useTranslations<'registro'>>;
  onEditar: (paso: number) => void;
}) {
  const sede = sedes.find((s) => s.id === datos.sedeId);
  const generoLabel = opciones.genero.find((o) => o.value === datos.genero)?.label ?? '';
  const estadoCivilLabel = opciones.estadoCivil.find((o) => o.value === datos.estadoCivil)?.label ?? '';
  const profesionLabel = opciones.profesion.find((o) => o.value === datos.profesion)?.label ?? '';
  const tiempoLabel =
    opciones.tiempoCongregacion.find((o) => o.value === datos.tiempoCongregacion)?.label ?? '';

  const grupos: { paso: number; titulo: string; filas: { label: string; valor: string }[] }[] = [
    {
      paso: 1,
      titulo: t('tituloPaso1'),
      filas: [
        { label: t('campos.apellido'), valor: datos.apellido },
        { label: t('campos.nombre'), valor: datos.nombre },
        { label: t('campos.genero'), valor: generoLabel },
        { label: t('campos.fechaNacimiento'), valor: datos.fechaNacimiento },
      ],
    },
    {
      paso: 2,
      titulo: t('tituloPaso2'),
      filas: [
        { label: t('campos.numeroTelefono'), valor: `${datos.telefonoCodigoPais} ${datos.telefonoNumero}` },
        { label: t('campos.direccion'), valor: datos.direccion },
        { label: t('campos.sede'), valor: sede?.nombre ?? '' },
      ],
    },
    {
      paso: 3,
      titulo: t('tituloPaso3'),
      filas: [
        { label: t('campos.estadoCivil'), valor: estadoCivilLabel },
        { label: t('campos.profesion'), valor: profesionLabel },
        ...(datos.profesion === 'otro'
          ? [{ label: t('campos.profesionDetalle'), valor: datos.profesionDetalle }]
          : []),
        { label: t('campos.tiempoCongregacion'), valor: tiempoLabel },
      ],
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {grupos.map((grupo) => (
        <section
          key={grupo.paso}
          className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
        >
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{grupo.titulo}</h3>
            <button
              type="button"
              onClick={() => onEditar(grupo.paso)}
              className="shrink-0 text-sm font-medium text-primary underline-offset-2 hover:underline"
            >
              {t('botones.editar')}
            </button>
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            {grupo.filas.map((fila) => (
              <Fragment key={fila.label}>
                <dt className="font-medium text-zinc-600 dark:text-zinc-400">{fila.label}</dt>
                <dd className="text-zinc-700 dark:text-zinc-300">{fila.valor || '—'}</dd>
              </Fragment>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}

function Campo({
  label,
  name,
  type = 'text',
  required,
  value,
  onChange,
  error,
  errorTexto,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  error?: boolean;
  errorTexto: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium">
      {label}
      <input
        name={name}
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error || undefined}
        aria-describedby={error ? `${name}-error` : undefined}
        className="h-10 rounded-md border border-zinc-300 px-3 text-sm font-normal aria-invalid:border-destructive dark:border-zinc-700 dark:bg-zinc-900"
      />
      {error && (
        <span id={`${name}-error`} className="text-sm font-normal text-destructive">
          {errorTexto}
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
  value,
  onChange,
  error,
  errorTexto,
  placeholder,
}: {
  label: string;
  name: string;
  required?: boolean;
  opciones: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  error?: boolean;
  errorTexto: string;
  placeholder: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm font-medium">
      {label}
      <select
        name={name}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error || undefined}
        aria-describedby={error ? `${name}-error` : undefined}
        className="h-10 rounded-md border border-zinc-300 px-3 text-sm font-normal aria-invalid:border-destructive dark:border-zinc-700 dark:bg-zinc-900"
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {opciones.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error && (
        <span id={`${name}-error`} className="text-sm font-normal text-destructive">
          {errorTexto}
        </span>
      )}
    </label>
  );
}

function CampoTelefono({
  labelTelefono,
  labelCodigo,
  codigoPais,
  numero,
  onChangeCodigo,
  onChangeNumero,
  error,
  errorTexto,
  placeholderNumero,
}: {
  labelTelefono: string;
  labelCodigo: string;
  codigoPais: string;
  numero: string;
  onChangeCodigo: (value: string) => void;
  onChangeNumero: (value: string) => void;
  error?: boolean;
  errorTexto: string;
  placeholderNumero: string;
}) {
  return (
    <div className="flex flex-col gap-1 text-sm font-medium">
      {labelTelefono}
      <div className="flex gap-2">
        <select
          name="telefonoCodigoPais"
          required
          value={codigoPais}
          onChange={(e) => onChangeCodigo(e.target.value)}
          aria-label={labelCodigo}
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
          aria-label={labelTelefono}
          aria-invalid={error || undefined}
          value={numero}
          placeholder={placeholderNumero}
          onChange={(e) => onChangeNumero(e.target.value.replace(/[^0-9]/g, ''))}
          className="h-10 flex-1 rounded-md border border-zinc-300 px-3 text-sm font-normal aria-invalid:border-destructive dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>
      {error && <span className="text-sm font-normal text-destructive">{errorTexto}</span>}
    </div>
  );
}
