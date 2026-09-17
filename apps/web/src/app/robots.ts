import type { MetadataRoute } from 'next';

const BASE_URL = process.env.NEXTAUTH_URL ?? 'http://localhost:3001';

// Historia 7, FR-037: la sección con sesión ((app)) no se indexa.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/inicio', '/mi-camino', '/avisos', '/perfil', '/registro', '/pendiente-tutor'],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
