'use client';

import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import { useLocale, useTranslations } from 'next-intl';
import {
  type Sede,
  type ErrorCode,
  apiFetch,
  ApiError,
  erroresPorCampo,
  mensajeDeCampo,
  formatearFechaCorta,
} from '@vida-sobrenatural/shared-types';
import {
  Button,
  PasoIndicador,
  CampoTelefono,
  ResumenErrores,
  MensajeErrorCampo,
  useEnvio,
  type ErrorResumen,
} from '@vida-sobrenatural/ui';
import { useOpcionesRegistro } from '../../../hooks/use-opciones-registro';

const TOTAL_PASOS = 4;
const EDAD_MINIMA = 18;

/** H-50: a qué paso pertenece cada campo del DTO, para saltar ahí si el error del servidor lo señala. */
const CAMPO_A_PASO: Record<string, number> = {
  apellido: 1,
  nombre: 1,
  genero: 1,
  fechaNacimiento: 1,
  telefono: 2,
  direccion: 2,
  sedeId: 2,
  estadoCivil: 3,
  profesion: 3,
  profesionDetalle: 3,
  tiempoCongregacion: 3,
};

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

/**
 * H-60/H-43 (revisión manual ronda 7): sigue siendo de cliente entera a
 * propósito (ver el comentario de page.tsx) — `sedesIniciales` llega ya
 * cargada desde el servidor, sin el useEffect+fetch que tenía antes.
 */
export function FormularioRegistro({ sedesIniciales, errorSedes }: { sedesIniciales: Sede[]; errorSedes: boolean }) {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const t = useTranslations('registro');
  const tErrores = useTranslations('errors');
  const locale = useLocale();
  const opciones = useOpcionesRegistro();
  const encabezadoRef = useRef<HTMLHeadingElement>(null);
  // H-19/H-16 (actualización 2026-09-18): update() tras un registro exitoso
  // dispara un re-render con session.user.estado ya "activa", que compite
  // con el useEffect de abajo (pensado para quien entra a /registro ya
  // activa de antes) — esta ref evita que ese efecto redirija a Primeros
  // pasos justo cuando handleSubmit ya está navegando a /registro/listo.
  const acabamosDeRegistrarRef = useRef(false);
  // H-50: cuando un error de campo del servidor obliga a saltar a un paso
  // anterior, el foco tiene que quedar en el resumen (ver ResumenErrores),
  // no en el título del paso — sin esta bandera, el useEffect de abajo
  // (pensado para la navegación normal con "Siguiente"/"Atrás") se lo roba.
  const saltoPorErrorRef = useRef(false);

  const sedes = sedesIniciales;
  const [paso, setPaso] = useState(1);
  const [error, setError] = useState<string | null>(
    errorSedes ? 'No pudimos cargar las Sedes. Volvé a intentarlo más tarde.' : null,
  );
  const [camposVacios, setCamposVacios] = useState<Record<string, boolean>>({});
  const [mensajesServidor, setMensajesServidor] = useState<Record<string, string>>({});
  const resumenErrores: ErrorResumen[] = useMemo(
    () => Object.entries(mensajesServidor).map(([campo, mensaje]) => ({ campo, mensaje })),
    [mensajesServidor],
  );
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
    if (saltoPorErrorRef.current) {
      // H-50: este salto de paso lo disparó un error de campo del servidor
      // — el foco tiene que quedar en el resumen, no acá (ver más abajo).
      saltoPorErrorRef.current = false;
      return;
    }
    encabezadoRef.current?.focus();
  }, [paso]);

  // Apellido/Nombre se precompletan desde el perfil de Google (editable) sin
  // necesitar un efecto: mientras la persona no haya tocado el campo, se
  // muestra (y se envía) el valor de la sesión — ajuste durante el render,
  // no un setState en un efecto (evita cascading renders innecesarios).
  const apellidoEfectivo = datos.apellido || session?.user.familyName || '';
  const nombreEfectivo = datos.nombre || session?.user.givenName || '';

  // H-57: el guard vive acá, no solo en el botón — si ya hay una petición en
  // curso, un segundo Enter/clic no dispara otra (ver useEnvio). Antes de
  // los early return de abajo: es un Hook, no puede ser condicional —
  // `enviarRegistro` (función normal, hoisted) se declara más abajo.
  const { enviando, ejecutar: handleSubmit } = useEnvio(enviarRegistro);

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
        <p className="text-muted-foreground">{t('textoNoAutenticado')}</p>
        <Button size="xl" className="w-fit" onClick={() => signIn('google', { callbackUrl: '/registro' })}>
          {t('botones.continuarGoogle')}
        </Button>
      </div>
    );
  }

  function actualizar<K extends keyof DatosFormulario>(campo: K, valor: DatosFormulario[K]) {
    setDatos((prev) => ({ ...prev, [campo]: valor }));
    if (camposVacios[campo]) {
      setCamposVacios((prev) => ({ ...prev, [campo]: false }));
    }
    if (mensajesServidor[campo]) {
      setMensajesServidor((prev) => Object.fromEntries(Object.entries(prev).filter(([c]) => c !== campo)));
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
      setCamposVacios((prev) => ({ ...prev, ...camposVaciosDelPaso(paso) }));
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

  async function enviarRegistro() {
    setError(null);
    setMensajesServidor({});

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
        setError(tErrores(err.code as ErrorCode));
        const campos = erroresPorCampo(err);
        if (campos) {
          const etiquetas: Record<string, string> = {
            apellido: t('campos.apellido'),
            nombre: t('campos.nombre'),
            genero: t('campos.genero'),
            fechaNacimiento: t('campos.fechaNacimiento'),
            telefono: t('campos.numeroTelefono'),
            direccion: t('campos.direccion'),
            sedeId: t('campos.sede'),
            estadoCivil: t('campos.estadoCivil'),
            profesion: t('campos.profesion'),
            profesionDetalle: t('campos.profesionDetalle'),
            tiempoCongregacion: t('campos.tiempoCongregacion'),
          };
          setMensajesServidor(
            Object.fromEntries(campos.map(({ campo, code }) => [campo, mensajeDeCampo(code, etiquetas[campo] ?? campo)])),
          );
          // Los campos con error pueden pertenecer a un paso anterior al 4
          // (todo el DTO se valida junto recién al enviar) — hay que
          // llevar a la persona ahí para que el campo señalado exista en
          // el DOM (y el enlace del resumen pueda enfocarlo).
          const pasoConError = Math.min(...campos.map(({ campo }) => CAMPO_A_PASO[campo] ?? TOTAL_PASOS));
          if (pasoConError !== paso) {
            saltoPorErrorRef.current = true;
            setPaso(pasoConError);
          }
        }
      } else {
        setError(tErrores('ERROR_INTERNO'));
      }
    }
  }

  const tituloPaso = t(`tituloPaso${paso}` as 'tituloPaso1');

  function estadoCampo(campo: string) {
    return {
      error: Boolean(camposVacios[campo]) || Boolean(mensajesServidor[campo]),
      errorTexto: mensajesServidor[campo] ?? t('errorCampo'),
    };
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-16">
      <h1 className="text-2xl font-semibold">{t('tituloPagina')}</h1>
      <p className="text-muted-foreground">
        {t('introPagina', { email: session?.user.email ?? '' })}
      </p>

      <PasoIndicador
        actual={paso}
        total={TOTAL_PASOS}
        etiqueta={t('paso', { actual: paso, total: TOTAL_PASOS })}
        nombrePaso={tituloPaso}
      />

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <ResumenErrores errores={resumenErrores} />

      <form
        onSubmit={(e) => {
          // El preventDefault tiene que correr SIEMPRE, no solo cuando el
          // guard de useEnvio deja pasar el envío (H-57) — si no, un envío
          // bloqueado por el guard sigue su curso nativo (navegación GET
          // con los campos como query string) en vez de quedar sin efecto.
          e.preventDefault();
          if (paso === TOTAL_PASOS) void handleSubmit();
        }}
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
              {...estadoCampo('apellido')}
            />
            <Campo
              label={t('campos.nombre')}
              name="nombre"
              required
              value={nombreEfectivo}
              onChange={(v) => actualizar('nombre', v)}
              {...estadoCampo('nombre')}
            />
            <CampoSelect
              label={t('campos.genero')}
              name="genero"
              required
              opciones={opciones.genero}
              value={datos.genero}
              onChange={(v) => actualizar('genero', v)}
              {...estadoCampo('genero')}
              placeholder={t('elegirOpcion')}
            />
            <Campo
              label={t('campos.fechaNacimiento')}
              name="fechaNacimiento"
              type="date"
              required
              value={datos.fechaNacimiento}
              onChange={(v) => actualizar('fechaNacimiento', v)}
              {...estadoCampo('fechaNacimiento')}
            />
          </>
        )}

        {paso === 2 && (
          <>
            <CampoTelefono
              id="campo-telefono"
              labelTelefono={t('campos.numeroTelefono')}
              labelCodigo={t('campos.codigoPais')}
              codigoPais={datos.telefonoCodigoPais}
              numero={datos.telefonoNumero}
              onChangeCodigo={(v) => actualizar('telefonoCodigoPais', v)}
              onChangeNumero={(v) => actualizar('telefonoNumero', v)}
              {...estadoCampo('telefono')}
              placeholderNumero={t('soloNumeros')}
            />
            <Campo
              label={t('campos.direccion')}
              name="direccion"
              required
              value={datos.direccion}
              onChange={(v) => actualizar('direccion', v)}
              {...estadoCampo('direccion')}
            />
            <CampoSelect
              label={t('campos.sede')}
              name="sedeId"
              required
              opciones={sedes.map((s) => ({ value: s.id, label: s.nombre }))}
              value={datos.sedeId}
              onChange={(v) => actualizar('sedeId', v)}
              {...estadoCampo('sedeId')}
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
              {...estadoCampo('estadoCivil')}
              placeholder={t('elegirOpcion')}
            />
            <CampoSelect
              label={t('campos.profesion')}
              name="profesion"
              required
              opciones={opciones.profesion}
              value={datos.profesion}
              onChange={(v) => actualizar('profesion', v)}
              {...estadoCampo('profesion')}
              placeholder={t('elegirOpcion')}
            />
            {datos.profesion === 'otro' && (
              <Campo
                label={t('campos.profesionDetalle')}
                name="profesionDetalle"
                required
                value={datos.profesionDetalle}
                onChange={(v) => actualizar('profesionDetalle', v)}
                {...estadoCampo('profesionDetalle')}
              />
            )}
            <CampoSelect
              label={t('campos.tiempoCongregacion')}
              name="tiempoCongregacion"
              required
              opciones={opciones.tiempoCongregacion}
              value={datos.tiempoCongregacion}
              onChange={(v) => actualizar('tiempoCongregacion', v)}
              {...estadoCampo('tiempoCongregacion')}
              placeholder={t('elegirOpcion')}
            />
          </>
        )}

        {paso === 4 && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">{t('resumenIntro')}</p>
            <ResumenDatos
              datos={{ ...datos, apellido: apellidoEfectivo, nombre: nombreEfectivo }}
              opciones={opciones}
              sedes={sedes}
              t={t}
              locale={locale}
              onEditar={setPaso}
            />

            {esProbablementeMayorDeEdad && (
              <label className="flex items-start gap-2 text-sm text-foreground">
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
            <Button type="button" variant="outline" size="xl" onClick={atras}>
              {t('botones.atras')}
            </Button>
          )}
          {paso < TOTAL_PASOS && (
            <Button type="button" size="xl" onClick={siguiente}>
              {t('botones.siguiente')}
            </Button>
          )}
          {paso === TOTAL_PASOS && (
            <Button type="submit" size="xl" loading={enviando} loadingText={t('botones.enviando')}>
              {t('botones.enviar')}
            </Button>
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
  locale,
  onEditar,
}: {
  datos: DatosFormulario;
  opciones: ReturnType<typeof useOpcionesRegistro>;
  sedes: Sede[];
  t: ReturnType<typeof useTranslations<'registro'>>;
  locale: string;
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
        {
          label: t('campos.fechaNacimiento'),
          valor: datos.fechaNacimiento ? formatearFechaCorta(datos.fechaNacimiento, locale) : '',
        },
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
        <section key={grupo.paso} className="flex flex-col gap-2 rounded-lg border border-border p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-medium text-foreground">{grupo.titulo}</h3>
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
                <dt className="font-medium text-muted-foreground">{fila.label}</dt>
                <dd className="text-foreground">{fila.valor || '—'}</dd>
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
        id={`campo-${name}`}
        name={name}
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error || undefined}
        aria-describedby={error ? `campo-${name}-error` : undefined}
        className="h-10 rounded-md border border-input bg-transparent px-3 text-sm font-normal aria-invalid:border-destructive dark:bg-input/30"
      />
      {error && <MensajeErrorCampo id={`campo-${name}-error`} mensaje={errorTexto} />}
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
        id={`campo-${name}`}
        name={name}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error || undefined}
        aria-describedby={error ? `campo-${name}-error` : undefined}
        className="h-10 rounded-md border border-input bg-transparent px-3 text-sm font-normal aria-invalid:border-destructive dark:bg-input/30"
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
      {error && <MensajeErrorCampo id={`campo-${name}-error`} mensaje={errorTexto} />}
    </label>
  );
}
