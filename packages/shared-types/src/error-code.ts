/**
 * Catálogo de códigos de error compartido por las tres apps — ver
 * specs/002-base-transversal/contracts/errores.md y data-model.md. Cada
 * feature nueva agrega sus propios valores acá; nunca reinterpreta uno
 * existente (Constitución, Principio X).
 */
export type ErrorCode =
  | 'NO_AUTENTICADO'
  | 'SIN_PERMISO'
  | 'NO_ENCONTRADO'
  | 'VALIDACION'
  | 'EMAIL_DUPLICADO'
  | 'SEDE_INVALIDA'
  | 'SEDE_NOMBRE_DUPLICADO'
  | 'CONTACTO_SEDE_REQUERIDO'
  | 'CONSENTIMIENTO_REQUERIDO'
  | 'PERSONA_NO_PENDIENTE_TUTOR'
  | 'VERIFICACION_LOGIN_FALLIDA'
  | 'EMAIL_NO_VERIFICADO'
  // H-29 (revisión manual, D108/D112): activar/vincular un tutor.
  | 'ACTIVAR_TUTOR_INVALIDO'
  | 'RELACION_FAMILIAR_INVALIDA'
  // H-74 (revisión manual ronda 8, D35): el candidato a tutor propuesto no
  // es un miembro activo y mayor de edad (o es la misma Persona que se
  // activa — ese caso cae en RELACION_FAMILIAR_INVALIDA, ya existente).
  | 'TUTOR_INVALIDO'
  // H-30 (revisión manual, D38/D102): Sedes. El formato de `horarios`
  // inválido no suma un código propio: cae en 'VALIDACION' con el código de
  // campo que ya deriva automáticamente validation-exception-factory.ts
  // ('HORARIOS_INVALIDO'), igual que cualquier otro campo de un DTO.
  | 'SEDE_UNICA_ACTIVA'
  // D119 (revisión manual ronda 6): eliminar (no inactivar) un registro de
  // catálogo con datos relacionados — Sede con Personas, primero de la
  // familia (Curso/Ministerio/Célula/Libro la suman cuando existan).
  | 'SEDE_TIENE_DATOS_RELACIONADOS'
  // specs/003-contenido-institucional, FR-011: la URL de YouTube cargada no
  // resuelve a un id de video reconocible (research.md Decisión 4). D121:
  // sólo se dispara si el Admin cargó algo — el campo vacío no es un error.
  | 'YOUTUBE_URL_INVALIDA'
  // specs/003-contenido-institucional, FR-022/FR-025: subida de portada de Libro (D110).
  | 'PORTADA_TIPO_INVALIDO'
  | 'PORTADA_TAMANO_EXCEDIDO'
  | 'LIBRO_TEXTO_ALTERNATIVO_REQUERIDO'
  // revision-manual H-94/H-94a: el lado corto de la imagen de origen es
  // más chico que el mínimo (800px) — agrandarla la deja borrosa, así que
  // se rechaza en vez de tolerarla.
  | 'PORTADA_DIMENSION_INSUFICIENTE'
  | 'ERROR_INTERNO';

/** Forma de la respuesta de error de apps/api — Problem Details (RFC 9457). */
export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  code: ErrorCode;
  detail: string;
  requestId: string;
  errors?: Array<{ campo: string; code: string }>;
}
