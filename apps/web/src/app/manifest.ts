import type { MetadataRoute } from 'next';

/**
 * Ícono de instalación de la PWA (FR-036, D47 — apps/web es la única de las
 * dos apps que es PWA; sin service worker ni offline, fuera de alcance de
 * esta spec). Los íconos son los derivados del isotipo por
 * scripts/generar-iconos-marca.mjs (research.md Decisión 8), servidos desde
 * `public/` porque un manifest necesita una URL pública real para cada uno.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Vida Sobrenatural',
    short_name: 'Vida Sobrenatural',
    description: 'Iglesia Vida Sobrenatural — La Plata.',
    start_url: '/',
    display: 'standalone',
    // docs/17-paleta-y-tokens.md — fondo crema del tema claro (#fbf9f4).
    background_color: '#fbf9f4',
    theme_color: '#fbf9f4',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
