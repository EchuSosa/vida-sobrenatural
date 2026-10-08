/**
 * spec 013 (D212) — los Cursos los fija el código. Lote 0 global: las
 * combinaciones reconocidas (con la de Vida de Servicio, spec 008). Los DTOs
 * los agrega la sesión de la 013 en este archivo (T008).
 */
export type CategoriaCurso = 'vida_nueva' | 'vida_de_servicio';
export type TipoCurso = 'individual' | 'grupal';
export type ModalidadCurso = 'seguimiento_por_encuentros' | 'liberacion_programada';

export interface CursoReconocido {
  categoria: CategoriaCurso;
  tipo: TipoCurso;
  modalidad: ModalidadCurso;
  prerequisitoCategoria: CategoriaCurso | null;
}

export const CURSOS_RECONOCIDOS: readonly CursoReconocido[] = [
  { categoria: 'vida_nueva', tipo: 'individual', modalidad: 'seguimiento_por_encuentros', prerequisitoCategoria: null },
  { categoria: 'vida_nueva', tipo: 'grupal', modalidad: 'seguimiento_por_encuentros', prerequisitoCategoria: null },
  { categoria: 'vida_de_servicio', tipo: 'grupal', modalidad: 'liberacion_programada', prerequisitoCategoria: 'vida_nueva' },
];

export const CURSO_DESCRIPCION_MAX = 500;
