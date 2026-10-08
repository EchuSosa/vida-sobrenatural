import type { MetadataRoute } from 'next';
import { obtenerSlugsDeEventos } from '../components/eventos/api-eventos';

// Solo rutas públicas (Historia 7, FR-038) — D85: la URL base sale de env.
const BASE_URL = process.env.NEXTAUTH_URL ?? 'http://localhost:3001';

// Exportada: también la usa apps/web/e2e/axe-todas-las-rutas.spec.ts (H-61)
// para no mantener una segunda lista de rutas a mano.
// FR-009 (spec 003): subpáginas de Nosotros, cada una con su propia entrada
// para buscadores, aunque no agreguen ítems al menú principal (D115).
export const RUTAS_PUBLICAS = [
  '/',
  '/nosotros',
  '/nosotros/quienes-somos',
  '/nosotros/vision-mision-valores',
  '/nosotros/liderazgo',
  '/nosotros/en-que-creemos',
  '/nosotros/palabra-profetica',
  '/nosotros/ediciones-vs',
  '/primeros-pasos',
  '/ministerios',
  '/eventos',
  '/visitanos',
  '/dar',
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // spec 011 (FR-006): cada Evento publicado y no eliminado, con su slug.
  const eventos = await obtenerSlugsDeEventos();
  return [
    ...RUTAS_PUBLICAS.map((ruta) => ({ url: `${BASE_URL}${ruta}`, lastModified: new Date() })),
    ...eventos.map((e) => ({ url: `${BASE_URL}/eventos/${e.slug}`, lastModified: new Date(e.updatedAt) })),
  ];
}
