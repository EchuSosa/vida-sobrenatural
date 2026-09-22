import { cn } from 'cn';
import isotipoClaro from '../assets/marca/logo-oscuro-1024.png';
import isotipoOscuro from '../assets/marca/logo-blanco-1024.png';

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
 * rectángulo gris ("se lee como diseñado" en vez de "como roto"). FR-034:
 * el isotipo centrado al 20% de opacidad como marca de agua, en la versión
 * según tema (D95/D106) — decorativo (`alt=""`), no duplica el
 * `aria-label` del contenedor. `<img>` en vez de `next/image`: este paquete
 * no depende de `next` (docs/10-stack-tecnico.md), y el loader de
 * imágenes de Next ya transforma el import estático en las dos apps que
 * lo consumen (research.md Decisión 7 de 003-contenido-institucional).
 */
export function PlaceholderImagen({ aspecto, etiqueta, mostrarTexto = false, className }: PlaceholderImagenProps) {
  return (
    <div
      role="img"
      aria-label={etiqueta}
      className={cn(
        'relative flex items-center justify-center overflow-hidden rounded-md bg-secondary p-2 text-center text-xs text-muted-foreground',
        aspecto === 'equipo' ? 'aspect-[3/2]' : 'aspect-[2/3]',
        className,
      )}
    >
      <img
        src={isotipoClaro.src}
        alt=""
        className="absolute inset-0 m-auto h-1/2 w-1/2 object-contain opacity-20 dark:hidden"
      />
      <img
        src={isotipoOscuro.src}
        alt=""
        className="absolute inset-0 m-auto hidden h-1/2 w-1/2 object-contain opacity-20 dark:block"
      />
      {mostrarTexto && <span className="relative">{etiqueta}</span>}
    </div>
  );
}
