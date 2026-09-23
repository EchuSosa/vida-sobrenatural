import * as Sentry from '@sentry/nextjs';

/**
 * Monitoreo de errores (D101) — desactivado si no hay DSN (el SDK no envía
 * nada cuando `dsn` es `undefined`, ver research.md Decisión 8).
 * `sendDefaultPii: false` + `beforeSend` sin datos personales (Constitución
 * Principio X).
 */
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? 'local',
  sendDefaultPii: false,
  beforeSend(event) {
    return quitarDatosPersonales(event);
  },
});

// H-112: el propio SDK lo pide ("ACTION REQUIRED...") para instrumentar
// navegaciones — sin esto, el aviso se repite en cada corrida de e2e/dev.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

function quitarDatosPersonales<T extends { request?: { data?: unknown } }>(event: T): T {
  if (event.request?.data && typeof event.request.data === 'object') {
    const data = { ...(event.request.data as Record<string, unknown>) };
    for (const campo of ['email', 'telefono', 'direccion', 'fechaNacimiento', 'apellido', 'nombre']) {
      delete data[campo];
    }
    event.request.data = data;
  }
  return event;
}
