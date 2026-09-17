import type { MetadataRoute } from 'next';

// Historia 7, FR-037 — todo el backoffice queda fuera de buscadores.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', disallow: '/' }],
  };
}
