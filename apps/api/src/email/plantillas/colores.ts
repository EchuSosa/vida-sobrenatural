/**
 * Colores de los mails (D118, research.md #7 de la 007). Un mail no puede leer
 * variables CSS ni todos los clientes entienden `oklch()`: acá van los tokens
 * del tema CLARO de `packages/ui/src/styles/theme.css`, convertidos a hex. Cada
 * valor nombra su token; si el token cambia, se cambia acá (y se vuelve a
 * medir el contraste, `docs/17-paleta-y-tokens.md`, sección "Email").
 * Ninguna plantilla escribe un color suelto: todas leen este objeto.
 */
export const COLORES_EMAIL = {
  /** `--background` oklch(0.982 0.007 85) */
  fondo: '#fbf9f4',
  /** `--card` oklch(1 0 0) */
  tarjeta: '#ffffff',
  /** `--foreground` oklch(0.255 0.030 45) */
  texto: '#2f1e17',
  /** `--muted-foreground` oklch(0.480 0.028 55) */
  textoSecundario: '#6b5a4f',
  /** `--primary` oklch(0.520 0.120 42) */
  primario: '#a14e2b',
  /** `--muted` oklch(0.950 0.012 82) */
  apagado: '#f2eee6',
  /** `--border` oklch(0.885 0.015 80) */
  borde: '#ded8ce',
} as const;
