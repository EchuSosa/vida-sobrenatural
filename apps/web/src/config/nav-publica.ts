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

export const NAV_PUBLICA: ItemNavPublica[] = [
  { href: '/nosotros', labelKey: 'nosotros' },
  { href: '/primeros-pasos', labelKey: 'primerosPasos' },
  { href: '/ministerios', labelKey: 'ministerios' },
  { href: '/eventos', labelKey: 'eventos' },
  { href: '/visitanos', labelKey: 'visitanos' },
];

export const NAV_PUBLICA_ACCIONES: ItemNavPublica[] = [
  { href: '/dar', labelKey: 'dar', destacado: true },
  // Reutiliza el punto de entrada ya construido en el spec 001 (ahí vive el
  // botón real de signIn('google', ...), no un login propio).
  { href: '/registro', labelKey: 'ingresar', destacado: true },
];
