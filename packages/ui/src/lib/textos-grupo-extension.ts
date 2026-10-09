import type { DiaSemana } from '@vida-sobrenatural/shared-types';

/**
 * spec 014: los textos de días y horario de un Grupo de Extensión, para la web
 * app y el backoffice (Principio XI). `t` es el traductor de un namespace que
 * tiene `dias.<dia>`, `y` y `horario` (D84: ningún texto vive acá).
 */
type T = (clave: string, valores?: Record<string, string | number>) => string;

/** "martes y jueves", "lunes, miércoles y viernes" — con los días del namespace `grupoExtension`. */
export function textoDias(dias: readonly DiaSemana[], t: T): string {
  const nombres = dias.map((d) => t(`dias.${d}`));
  if (nombres.length <= 1) return nombres.join('');
  return `${nombres.slice(0, -1).join(', ')} ${t('y')} ${nombres[nombres.length - 1]}`;
}

/** "Martes y jueves a las 19:00 hs". */
export function textoHorario(dias: readonly DiaSemana[], hora: string, t: T): string {
  const texto = t('horario', { dias: textoDias(dias, t), hora });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** "Ana", "Ana y Pedro". */
export function textoNombres(nombres: readonly string[], t: T): string {
  if (nombres.length <= 1) return nombres.join('');
  return `${nombres.slice(0, -1).join(', ')} ${t('y')} ${nombres[nombres.length - 1]}`;
}
