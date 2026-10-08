import type { CategoriaCurso, TipoCurso } from '@vida-sobrenatural/shared-types';

// Sin 'use client' (H-113): lo usan páginas de servidor y de cliente.
/** "Vida Nueva · Grupal": la combinación de un Curso, con los textos de `cursos.categorias/tipos`. */
export function combinacion(t: (clave: `categorias.${CategoriaCurso}` | `tipos.${TipoCurso}`) => string, categoria: CategoriaCurso, tipo: TipoCurso): string {
  return `${t(`categorias.${categoria}`)} · ${t(`tipos.${tipo}`)}`;
}
