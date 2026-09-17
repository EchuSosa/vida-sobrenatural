import type { MetadataRoute } from 'next';

// Solo rutas públicas (Historia 7, FR-038) — D85: la URL base sale de env.
const BASE_URL = process.env.NEXTAUTH_URL ?? 'http://localhost:3001';

const RUTAS_PUBLICAS = ['/', '/nosotros', '/primeros-pasos', '/ministerios', '/eventos', '/visitanos', '/dar'];

export default function sitemap(): MetadataRoute.Sitemap {
  return RUTAS_PUBLICAS.map((ruta) => ({
    url: `${BASE_URL}${ruta}`,
    lastModified: new Date(),
  }));
}
