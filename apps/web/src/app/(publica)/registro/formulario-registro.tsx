'use client';

import { useEffect } from 'react';
import { type Sede } from '@vida-sobrenatural/shared-types';
import { Button, PasoIndicador, ResumenErrores } from '@vida-sobrenatural/ui';
import { useFormularioRegistro } from '../../../hooks/use-formulario-registro';
import { TOTAL_PASOS } from './tipos';
import { Paso1DatosPersonales } from './paso-1-datos-personales';
import { Paso2Contacto } from './paso-2-contacto';
import { Paso3Perfil } from './paso-3-perfil';
import { Paso4Resumen } from './paso-4-resumen';

/**
 * H-60/H-43 (revisión manual ronda 7): sigue siendo de cliente entera a
 * propósito (ver el comentario de page.tsx) — `sedesIniciales` llega ya
 * cargada desde el servidor, sin el useEffect+fetch que tenía antes.
 *
 * H-44 (revisión manual): este archivo tenía antes 778 líneas — toda la
 * lógica de los cuatro pasos vivía acá adentro junto con su armado
 * visual. Se partió en piezas con una responsabilidad cada una (ver
 * `use-formulario-registro.ts` para el estado/validación/envío, y
 * `paso-N-*.tsx` para el JSX de cada paso) SIN cambiar ningún
 * comportamiento — es sólo mover código, verificado con los mismos e2e
 * de siempre, sin tocarlos.
 */
export function FormularioRegistro({ sedesIniciales, errorSedes }: { sedesIniciales: Sede[]; errorSedes: boolean }) {
  const form = useFormularioRegistro(sedesIniciales, errorSedes);
  const { status, session, t } = form;

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

  // spec 007 (T024): sin sesión, el ingreso (Google o código) está en un solo
  // lugar, /ingresar — page.tsx ya redirige en el servidor; esto cubre la
  // sesión que se pierde con la pantalla abierta.
  if (status === 'unauthenticated') {
    return <RedirigirAIngresar texto={t('cargando')} />;
  }

  const { paso, error, validacion, enviando, handleSubmit, siguiente, atras, tituloPaso, encabezadoRef } = form;

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-16">
      <h1 className="text-2xl font-semibold">{t('tituloPagina')}</h1>
      {/* ajustes-ux #31: sin "autorizaste el acceso" (jerga), y el email
          puede cortarse en cualquier punto en vez de partir una palabra. */}
      <p className="text-muted-foreground [overflow-wrap:anywhere]">
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

      <ResumenErrores errores={validacion.resumen} foco={validacion.foco} />

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

        {paso === 1 && <Paso1DatosPersonales form={form} />}
        {paso === 2 && <Paso2Contacto form={form} />}
        {paso === 3 && <Paso3Perfil form={form} />}
        {paso === 4 && <Paso4Resumen form={form} />}

        {/* ajustes-ux #28 (docs/15 "Botones"): en celular, apilados a todo el
            ancho con la principal arriba (col-reverse: "Atrás" va primero en
            el DOM); en escritorio, a la derecha con la principal a la derecha. */}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end [&>*]:w-full sm:[&>*]:w-auto">
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

function RedirigirAIngresar({ texto }: { texto: string }) {
  useEffect(() => {
    // Carga completa a propósito (no `router.replace`): si el servidor sí ve
    // una sesión que el `SessionProvider` todavía no tiene, /ingresar vuelve
    // a /registro y una navegación del cliente entraría en un ciclo.
    window.location.replace('/ingresar');
  }, []);
  return <div className="mx-auto max-w-xl px-4 py-16">{texto}</div>;
}
