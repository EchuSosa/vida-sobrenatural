import { cn } from 'cn';
import isotipoClaro from '../assets/marca/logo-oscuro-1024.png';
import isotipoOscuro from '../assets/marca/logo-blanco-1024.png';
import logotipoClaro from '../assets/marca/logotipo-oscuro-600.png';
import logotipoOscuro from '../assets/marca/logotipo-blanco-600.png';

export interface MarcaProps {
  /** 'isotipo' = solo el símbolo, cuadrado — usar en celular (7.5:1 del logotipo produce scroll
   * horizontal a 320px, H-62/H-87). 'logotipo' = símbolo + nombre, para escritorio y el pie. */
  variante: 'isotipo' | 'logotipo';
  /** Sobrescribe el tamaño por defecto (`size-8` para isotipo, `h-7 w-auto` para logotipo). */
  className?: string;
}

/**
 * H-80/H-87: antes de este componente, la marca se ponía con dos `<img>` y
 * `dark:hidden`/`hidden dark:block` copiados a mano en cada pantalla — cuatro
 * copias y un quinto lugar que se la olvidó. Acá vive una sola vez
 * (Principio XI): ninguna pantalla vuelve a importar los PNG de
 * `assets/marca/` directamente.
 *
 * H-80 (causa raíz): un `<img>` con `width:auto` dentro de un flex-col se
 * estira al ancho del contenedor (`align-items: stretch` por defecto actúa
 * sobre el eje transversal, que en un flex-col es el ancho) — no importa si
 * el elemento cuelga directo del flex-col o de un wrapper intermedio, salvo
 * que ese wrapper se saque del stretch explícitamente. `self-start` en la
 * raíz de este componente lo hace una vez, así que da igual en qué contenedor
 * (fila, columna, grilla) se lo use.
 *
 * `<img>` en vez de `next/image`: este paquete no depende de `next`
 * (docs/10-stack-tecnico.md) — mismo criterio que la marca de agua de
 * `PlaceholderImagen`.
 */
export function Marca({ variante, className }: MarcaProps) {
  const [claro, oscuro] = variante === 'isotipo' ? [isotipoClaro, isotipoOscuro] : [logotipoClaro, logotipoOscuro];
  const tamano = variante === 'isotipo' ? 'size-8' : 'h-7 w-auto';

  return (
    <span className="inline-flex shrink-0 items-center self-start">
      <img src={claro.src} alt="Vida Sobrenatural" className={cn(tamano, 'dark:hidden', className)} />
      <img src={oscuro.src} alt="Vida Sobrenatural" className={cn(tamano, 'hidden dark:block', className)} />
    </span>
  );
}
