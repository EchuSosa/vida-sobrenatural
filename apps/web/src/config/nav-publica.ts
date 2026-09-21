/**
 * Menú de la web pública (sin sesión) — Historia 1, FR-001.
 * Contrato para features futuras: specs/002-base-transversal/contracts/nav-config.md.
 */
export interface ItemNavPublica {
  href: string;
  /** Clave en messages/es.json, namespace "nav" (FR-030 — sin texto fijo acá). */
  labelKey: string;
  /** true solo para "Dar"/"Ingresar" — se renderizan como botón, no como link de menú. */
  destacado?: boolean;
}

/**
 * H-46 (revisión manual ronda 4, D115): cuatro ítems fijos, sin submenús
 * desplegables — con lo que suma el spec 003 el menú llegaba a siete
 * secciones y no entraba en escritorio. Ministerios pasa adentro de
 * Primeros pasos (última etapa del proceso, ver esa página) — conserva su
 * URL propia (`/ministerios`) y su entrada en el sitemap (D82, sitemap.ts),
 * solo deja de estar en este menú.
 */
export const NAV_PUBLICA: ItemNavPublica[] = [
  { href: '/nosotros', labelKey: 'nosotros' },
  { href: '/primeros-pasos', labelKey: 'primerosPasos' },
  { href: '/eventos', labelKey: 'eventos' },
  { href: '/visitanos', labelKey: 'visitanos' },
];

export const NAV_PUBLICA_ACCIONES: ItemNavPublica[] = [
  { href: '/dar', labelKey: 'dar', destacado: true },
  // Reutiliza el punto de entrada ya construido en el spec 001 (ahí vive el
  // botón real de signIn('google', ...), no un login propio).
  { href: '/registro', labelKey: 'ingresar', destacado: true },
];
