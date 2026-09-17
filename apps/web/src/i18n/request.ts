import { getRequestConfig } from 'next-intl/server';

// Sin routing por idioma todavía — un solo locale fijo "es" (D84, research.md
// Decisión 4). Se agrega `[locale]` recién cuando exista un segundo idioma.
export default getRequestConfig(async () => ({
  locale: 'es',
  messages: (await import('../messages/es.json')).default,
}));
