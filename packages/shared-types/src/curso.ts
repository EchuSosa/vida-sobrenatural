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

/** Un Curso en el catálogo (`GET /cursos`, contracts/cursos-api.md). */
export interface CursoListado {
  id: string;
  nombre: string;
  categoria: CategoriaCurso;
  tipo: TipoCurso;
  modalidad: ModalidadCurso;
  activo: boolean;
  /** Grupos `en_curso` de este Curso (decide la confirmación reforzada al inactivar, D38). */
  gruposEnCurso: number;
  /** Tiene algún Grupo, en curso o terminado: no se puede eliminar (D119). */
  tieneGrupos: boolean;
}

export interface CursoDetalle extends CursoListado {
  descripcion: string | null;
  createdAt: string;
  updatedAt: string;
}

/** `GET /cursos/papelera`. */
export interface CursoEnPapelera {
  id: string;
  nombre: string;
  categoria: CategoriaCurso;
  tipo: TipoCurso;
  eliminadoEn: string;
}

/** `GET /cursos/disponibles-para-alta`: una combinación reconocida sin Curso (o en la papelera → se restaura). */
export interface CursoDisponible {
  categoria: CategoriaCurso;
  tipo: TipoCurso;
  modalidad: ModalidadCurso;
  restaurar: boolean;
}

/** `GET /catalogos/resumen` — la 009 suma `ministerios` y `celulas`. */
export interface ResumenCatalogos {
  sedes: { activos: number; total: number };
  cursos: { activos: number; total: number };
}

/** ¿La combinación está entre las que entiende el código (D212, FR-056)? */
export function cursoReconocido(categoria: string, tipo: string): CursoReconocido | undefined {
  return CURSOS_RECONOCIDOS.find((c) => c.categoria === categoria && c.tipo === tipo);
}
