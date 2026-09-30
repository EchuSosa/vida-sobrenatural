'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useLocale, useTranslations } from 'next-intl';
import {
  type Sede,
  type ErrorCode,
  TELEFONO_REGEX,
  apiFetch,
  ApiError,
  erroresPorCampo,
  mensajeDeCampo,
} from '@vida-sobrenatural/shared-types';
import { useEnvio, useValidacionCampos, type ValidacionCampo } from '@vida-sobrenatural/ui';
import { useOpcionesRegistro } from './use-opciones-registro';
import {
  TOTAL_PASOS,
  EDAD_MINIMA,
  CAMPO_A_PASO,
  type DatosFormulario,
} from '../app/(publica)/registro/tipos';
import { calcularEdadAproximada } from '../app/(publica)/registro/helpers';

/**
 * H-44 (revisión manual): toda la lógica de validación, navegación entre
 * pasos y envío de `formulario-registro.tsx` (antes 778 líneas), separada
 * del armado visual — movida tal cual, sin cambiar ningún texto, ningún
 * orden de campos, ninguna validación ni ningún salto de paso.
 *
 * Se llama una sola vez, sin condicionales, ANTES de cualquier `return`
 * temprano en `FormularioRegistro` — los hooks de React que llama acá
 * adentro (useSession, useRouter, useTranslations×2, useLocale,
 * useOpcionesRegistro, useRef×3, useState×3, useValidacionCampos,
 * useEffect×2, useEnvio) corren en el mismo orden, la misma cantidad de
 * veces, que cuando estaban escritos directo en el componente.
 */
export function useFormularioRegistro(sedesIniciales: Sede[], errorSedes: boolean) {
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
  // H-72 (revisión manual ronda 7): un error se limpia al escribir y se
  // revalida al salir del campo — antes solo se limpiaba al reintentar el
  // envío (docs/15-guia-ux-ui.md pide las dos cosas). Pieza compartida
  // (H-50), usada igual en los seis formularios.
  const validacion = useValidacionCampos();
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
  // los early return del componente: es un Hook, no puede ser condicional —
  // `enviarRegistro` (función normal, hoisted) se declara más abajo.
  const { enviando, ejecutar: handleSubmit } = useEnvio(enviarRegistro);

  function actualizar<K extends keyof DatosFormulario>(campo: K, valor: DatosFormulario[K]) {
    setDatos((prev) => ({ ...prev, [campo]: valor }));
    // "telefono" es el nombre del campo del lado de la API/el resumen —
    // CampoTelefono en sí actualiza "telefonoCodigoPais"/"telefonoNumero".
    validacion.limpiar(campo === 'telefonoCodigoPais' || campo === 'telefonoNumero' ? 'telefono' : campo);
  }

  // H-72: una regla por campo, reutilizada en el onBlur de cada uno y al
  // intentar avanzar de paso con algo sin completar — la misma pieza que
  // decide "¿está bien?" decide también qué mensaje mostrar.
  const requerido: ValidacionCampo<string> = { esValido: (v) => v.trim() !== '', mensaje: t('errorCampo') };
  const validaciones = {
    apellido: requerido,
    nombre: requerido,
    genero: requerido,
    fechaNacimiento: { ...requerido, mensaje: t('errorFechaNacimiento') },
    telefono: {
      esValido: (v: { codigoPais: string; numero: string }) => TELEFONO_REGEX.test(`${v.codigoPais} ${v.numero}`),
      mensaje: mensajeDeCampo('TELEFONO_INVALIDO', t('campos.numeroTelefono')),
    } satisfies ValidacionCampo<{ codigoPais: string; numero: string }>,
    direccion: requerido,
    sedeId: requerido,
    estadoCivil: requerido,
    profesion: requerido,
    profesionDetalle: {
      esValido: () => datos.profesion !== 'otro' || datos.profesionDetalle.trim() !== '',
      mensaje: t('errorCampo'),
    } satisfies ValidacionCampo<string>,
    tiempoCongregacion: requerido,
  };

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

  function revalidarPaso(numeroPaso: number) {
    if (numeroPaso === 1) {
      validacion.revalidar('apellido', apellidoEfectivo, validaciones.apellido);
      validacion.revalidar('nombre', nombreEfectivo, validaciones.nombre);
      validacion.revalidar('genero', datos.genero, validaciones.genero);
      validacion.revalidar('fechaNacimiento', datos.fechaNacimiento, validaciones.fechaNacimiento);
    } else if (numeroPaso === 2) {
      validacion.revalidar(
        'telefono',
        { codigoPais: datos.telefonoCodigoPais, numero: datos.telefonoNumero },
        validaciones.telefono,
      );
      validacion.revalidar('direccion', datos.direccion, validaciones.direccion);
      validacion.revalidar('sedeId', datos.sedeId, validaciones.sedeId);
    } else if (numeroPaso === 3) {
      validacion.revalidar('estadoCivil', datos.estadoCivil, validaciones.estadoCivil);
      validacion.revalidar('profesion', datos.profesion, validaciones.profesion);
      if (datos.profesion === 'otro') {
        validacion.revalidar('profesionDetalle', datos.profesionDetalle, validaciones.profesionDetalle);
      } else {
        validacion.limpiar('profesionDetalle');
      }
      validacion.revalidar('tiempoCongregacion', datos.tiempoCongregacion, validaciones.tiempoCongregacion);
    }
  }

  function siguiente() {
    if (!pasoValido(paso)) {
      // Marca los campos sin completar del paso actual sin llamar a la API todavía.
      revalidarPaso(paso);
      return;
    }
    setPaso((p) => Math.min(p + 1, TOTAL_PASOS));
  }

  function atras() {
    setPaso((p) => Math.max(p - 1, 1));
  }

  const edadAproximada = calcularEdadAproximada(datos.fechaNacimiento);
  const esProbablementeMayorDeEdad = edadAproximada === null || edadAproximada >= EDAD_MINIMA;

  async function enviarRegistro() {
    setError(null);
    validacion.reset();

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
            // H-104: la casilla de consentimiento participa del sistema de
            // errores como cualquier otro campo.
            consentimientoDatos: t('campos.consentimiento'),
          };
          validacion.reemplazar(
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
      error: Boolean(validacion.mensajes[campo]),
      errorTexto: validacion.mensajes[campo] ?? t('errorCampo'),
    };
  }

  return {
    session,
    status,
    t,
    locale,
    opciones,
    encabezadoRef,
    sedes,
    paso,
    setPaso,
    error,
    validacion,
    datos,
    apellidoEfectivo,
    nombreEfectivo,
    enviando,
    handleSubmit,
    actualizar,
    validaciones,
    siguiente,
    atras,
    edadAproximada,
    esProbablementeMayorDeEdad,
    tituloPaso,
    estadoCampo,
  };
}

export type UseFormularioRegistroResult = ReturnType<typeof useFormularioRegistro>;
