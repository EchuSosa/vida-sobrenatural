'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { type Sede } from '@vida-sobrenatural/shared-types';
import { ChevronLeft, CircleAlert, RotateCw } from 'lucide-react';
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
  // lugar, /ingresar — layout.tsx ya redirige en el servidor; esto cubre la
  // sesión que se pierde con la pantalla abierta, sin redirigir a ciegas.
  if (status === 'unauthenticated') {
    return <VerificarSesion texto={t('cargando')} update={form.update} />;
  }

  const { paso, error, validacion, enviando, handleSubmit, siguiente, atras, navegacionPausada, tituloPaso, encabezadoRef } = form;

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
        {/* QA ronda 1, BUG-04 (D249): en celular "Atrás" va arriba, antes del título del paso, y
            no en la pila de abajo: ahí caía justo donde estaba "Siguiente" del paso anterior y un
            doble toque volvía atrás. En escritorio sigue al lado de "Siguiente" (abajo). */}
        {paso > 1 && (
          <Button type="button" variant="outline" size="lg" onClick={atras} disabled={navegacionPausada} className="self-start sm:hidden">
            <ChevronLeft aria-hidden="true" />
            {t('botones.atras')}
          </Button>
        )}
        {/* tabIndex -1 + focus programático (arriba) — anuncia el paso nuevo sin robar el foco de un click real. */}
        <h2 ref={encabezadoRef} tabIndex={-1} className="text-lg font-medium outline-none">
          {tituloPaso}
        </h2>

        {paso === 1 && <Paso1DatosPersonales form={form} />}
        {paso === 2 && <Paso2Contacto form={form} />}
        {paso === 3 && <Paso3Perfil form={form} />}
        {paso === 4 && <Paso4Resumen form={form} />}

        {/* ajustes-ux #28 (docs/15 "Botones"): en celular, la principal a todo el
            ancho ("Atrás" va arriba, D249); en escritorio, a la derecha con la
            principal a la derecha (col-reverse: "Atrás" va primero en el DOM). */}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end [&>*]:w-full sm:[&>*]:w-auto">
          {paso > 1 && (
            <Button type="button" variant="outline" size="xl" onClick={atras} disabled={navegacionPausada} className="hidden sm:inline-flex">
              {t('botones.atras')}
            </Button>
          )}
          {paso < TOTAL_PASOS && (
            <Button type="button" size="xl" onClick={siguiente} disabled={navegacionPausada}>
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

type Verificacion = 'verificando' | 'error';

/**
 * El cliente dice "sin sesión" (`useSession` → `unauthenticated`), pero el servidor la vio: si no,
 * `layout.tsx` no habría dejado llegar acá. `useSession` responde `unauthenticated` tanto cuando NO
 * hay sesión como cuando el pedido a `/api/auth/session` FALLA (red cortada, `next dev` compilando).
 *
 * Antes se iba directo a /ingresar. Si el pedido había fallado, el servidor veía la sesión y volvía a
 * /registro, y eso se repetía sin fin (docs/24: el "bucle de recargas" de los e2e en local, 2026-11-04).
 * Ahora se le pregunta al servidor una vez:
 * - sin sesión → /ingresar, con carga completa (la sesión se perdió con la pantalla abierta);
 * - con sesión → se actualiza la del cliente;
 * - si falla → se dice, con "Reintentar". Nunca redirige a ciegas.
 */
/** Lo que el servidor dice de la sesión, sin tocar el estado de React. */
async function consultarSesion(update: () => Promise<unknown>): Promise<'sin_sesion' | 'lista' | 'error'> {
  try {
    const respuesta = await fetch('/api/auth/session', { cache: 'no-store' });
    if (!respuesta.ok) return 'error';
    const sesion = (await respuesta.json()) as { user?: unknown } | null;
    if (!sesion?.user) return 'sin_sesion';
    // Con sesión: se pone al día la del cliente. Si ni así la trae, es un error (no queda "Cargando…").
    return (await update()) ? 'lista' : 'error';
  } catch {
    return 'error';
  }
}

function VerificarSesion({ texto, update }: { texto: string; update: () => Promise<unknown> }) {
  const t = useTranslations('registro.sesion');
  const [estado, setEstado] = useState<Verificacion>('verificando');
  const verificar = useCallback(
    () =>
      consultarSesion(update).then((resultado) => {
        if (resultado === 'sin_sesion') window.location.replace('/ingresar');
        else if (resultado === 'error') setEstado('error');
        // 'lista': `useSession` pasa a `authenticated` y este componente deja de mostrarse.
      }),
    [update],
  );

  useEffect(() => {
    void verificar();
  }, [verificar]);

  if (estado === 'verificando') return <div className="mx-auto max-w-xl px-4 py-16">{texto}</div>;
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-16">
      <div role="alert" className="flex gap-2 rounded-md border border-destructive p-4 text-base">
        <CircleAlert aria-hidden className="mt-0.5 size-5 shrink-0 text-destructive" />
        <div className="flex flex-col gap-1">
          <p className="font-semibold">{t('errorTitulo')}</p>
          <p>{t('errorTexto')}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          size="xl"
          onClick={() => {
            setEstado('verificando');
            void verificar();
          }}
        >
          <RotateCw aria-hidden />
          {t('reintentar')}
        </Button>
        <a href="/ingresar" className="inline-flex min-h-11 items-center text-base underline underline-offset-4 hover:no-underline">
          {t('volverAIngresar')}
        </a>
      </div>
    </div>
  );
}
