import { cn } from 'cn';

export interface PlaceholderImagenProps {
  /** 'equipo' = 3:2 (fotos de equipo/pastoral); 'portada' = 2:3 (portadas de libros) — D118, docs/17-paleta-y-tokens.md. */
  aspecto: 'equipo' | 'portada';
  /** Texto para aria-label siempre, y visible además cuando mostrarTexto es true (ej. Liderazgo). */
  etiqueta: string;
  mostrarTexto?: boolean;
  className?: string;
}

/**
 * Hueco de foto mientras falta el material real — D118 (docs/17-paleta-y-tokens.md,
 * sección "Placeholders de imagen"): un bloque en `--secondary`, no un
 * rectángulo gris ("se lee como diseñado" en vez de "como roto"). El logo de
 * cuatro pétalos centrado al 20% de opacidad queda pendiente — el SVG no
 * está en el repo todavía; agregarlo acá cuando exista, sin tocar el resto
 * del componente.
 */
export function PlaceholderImagen({ aspecto, etiqueta, mostrarTexto = false, className }: PlaceholderImagenProps) {
  return (
    <div
      role="img"
      aria-label={etiqueta}
      className={cn(
        'flex items-center justify-center rounded-md bg-secondary p-2 text-center text-xs text-muted-foreground',
        aspecto === 'equipo' ? 'aspect-[3/2]' : 'aspect-[2/3]',
        className,
      )}
    >
      {mostrarTexto && <span>{etiqueta}</span>}
    </div>
  );
}
