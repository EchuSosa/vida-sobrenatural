import * as Sentry from '@sentry/nextjs';

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
