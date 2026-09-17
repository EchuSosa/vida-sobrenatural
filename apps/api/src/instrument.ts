import * as Sentry from '@sentry/nestjs';

/**
 * Monitoreo de errores (D101) — desactivado si no hay DSN (el SDK no envía
 * nada cuando `dsn` es `undefined`, research.md Decisión 8). Se inicializa
 * como SDK directo (sin `SentryModule.forRoot()` en `AppModule`) para que los
 * tests que construyen `AppModule` vía `Test.createTestingModule` nunca
 * carguen `@sentry/nestjs` — mismo criterio que `nestjs-pino` (ver
 * research.md Decisión 5/main.ts): mantener el grafo de módulos de test
 * liviano y sin dependencias de bootstrap. `AllExceptionsFilter` llama a
 * `Sentry.captureException` para los errores 500.
 */
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT ?? 'local',
  sendDefaultPii: false,
  beforeSend(event) {
    if (event.request?.data && typeof event.request.data === 'object') {
      const data = { ...(event.request.data as Record<string, unknown>) };
      for (const campo of ['email', 'telefono', 'direccion', 'fechaNacimiento', 'apellido', 'nombre']) {
        delete data[campo];
      }
      event.request.data = data;
    }
    return event;
  },
});
