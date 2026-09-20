/**
 * H-24 (revisión manual, actualización 2026-09-20): íconos de redes para el
 * pie de página. `lucide-react` (instalado, 1.46.0) sacó los íconos de marca
 * (Facebook/Instagram/etc.) de su set hace varias versiones — no están
 * disponibles para importar. Se replican acá con el mismo estilo de trazo
 * (`stroke="currentColor"`, `strokeWidth={2}`) que el resto de los íconos de
 * Lucide ya usados en la app, en vez de sumar una dependencia nueva solo
 * para dos glifos.
 */
type IconoProps = { className?: string };

export function IconoFacebook({ className }: IconoProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3.5l1-4H14V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

export function IconoInstagram({ className }: IconoProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}
