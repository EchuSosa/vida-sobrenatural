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
  // revision-manual H-89: PATCH /libros/reordenar recibió un conjunto de
  // ids que no coincide exactamente con los Libros activos actuales (de
  // menos, de más, o ajenos) — la lista cambió mientras se reordenaba.
  | 'LIBRO_ORDEN_CONJUNTO_INVALIDO'
  // specs/005-roles-permisos-acceso, D133/H-128: otorgar un rol de cargo a
  // una Persona menor de edad (FR-011).
  | 'PERSONA_MENOR_DE_EDAD_NO_PUEDE_TENER_ROL_DE_CARGO'
  // specs/005-roles-permisos-acceso, D131/FR-002: quitar el rol admin (o
  // desactivar) a la Persona con adminSembrado=true.
  | 'NO_SE_PUEDE_DEGRADAR_AL_ADMIN_SEMBRADO'
  // specs/005-roles-permisos-acceso, FR-010: un Admin intenta quitarse a sí
  // mismo el rol admin.
  | 'ADMIN_NO_PUEDE_AUTO_REVOCARSE'
  // specs/005, Historia 6 (H-140): otorgar/quitar un rol de cargo desde una
  // sesión sin Persona asociada — el Admin tiene el permiso, pero el sistema
  // no puede identificar quién hace el cambio (ni registrarlo, FR-022, ni
  // aplicar FR-010), así que no lo hace. No es SIN_PERMISO.
  | 'SESION_SIN_PERSONA'
  // specs/005-roles-permisos-acceso, FR-009 (y FR-043 de la 004): quitar el
  // rol discipulador a una Persona con discipulados activos o propuestas
  // pendientes. Reemplaza al fallo cerrado de H-127
  // (DISCIPULADOR_SIN_VERIFICACION_DE_DISCIPULADOS_ACTIVOS, eliminado en la 004).
  | 'DISCIPULADOR_TIENE_DISCIPULADOS_ACTIVOS'
  // specs/004-vida-nueva-discipulado — Solicitud de Discipulado, propuesta y
  // aceptación (contracts/). Los códigos de CAMPO (FRANJAS_REQUERIDAS,
  // FRANJA_FIN_ANTERIOR_AL_INICIO, DIA_SEMANA_INVALIDO, FECHA_FUTURA,
  // CAPITULOS_REQUERIDO, BLOQUEO_FIN_ANTERIOR_AL_INICIO, BLOQUEO_YA_VENCIDO,
  // MOTIVO_DEMASIADO_LARGO, MAXIMO_POR_GRUPO_FUERA_DE_RANGO) NO van acá: caen
  // en 'VALIDACION' con su code de campo, como HORARIOS_INVALIDO (Principio X/IX).
  | 'SOLICITUD_DISCIPULADO_YA_PENDIENTE'
  | 'VIDA_NUEVA_EN_CURSO_O_COMPLETADA'
  | 'EDAD_INSUFICIENTE_PARA_PEDIR_SOLO'
  | 'SOLICITUD_NO_PENDIENTE'
  | 'SOLICITUD_NO_PROPUESTA'
  | 'DISCIPULADOR_NO_DISPONIBLE'
  | 'GRUPO_SIN_LUGAR'
  | 'PROPUESTA_NO_VIGENTE'
  | 'DISCIPULADO_NO_EN_CURSO'
  | 'FINALIZACION_NO_PROPUESTA'
  | 'FINALIZACION_YA_PROPUESTA'
  | 'BAJA_NO_PROPUESTA'
  | 'BAJA_YA_PROPUESTA'
  | 'REASIGNACION_AL_MISMO_DISCIPULADOR'
  | 'REASIGNACION_YA_PROPUESTA'
  // ==========================================================================
  // Lote 0 global (specs 006–013): todos los códigos de los contratos, uno por
  // regla (Principio X). Los de CAMPO van bajo 'VALIDACION' y no están acá
  // (sus textos: `errors.campos` de los dos es.json).
  // ==========================================================================
  // spec 006 — data-model.md, contracts/
  | 'DECLARACION_YA_PENDIENTE' // FR-010
  | 'ETAPA_YA_COMPLETADA' // FR-010, FR-014
  | 'ETAPA_EN_CURSO' // FR-010, FR-014
  | 'DECLARACION_NO_PENDIENTE'
  | 'COMPLETITUD_NO_VIGENTE'
  | 'HISTORIAL_VIDA_NUEVA_EN_REVISION' // FR-017
  | 'VIDA_NUEVA_COMPLETADA_POR_HISTORIAL' // FR-017
  | 'POSIBLE_DUPLICADO' // FR-035, con `coincidencias`
  | 'EMAIL_YA_CARGADO' // FR-037
  // D215 — DNI opcional en el alta del Admin
  | 'DNI_INVALIDO'
  | 'DNI_DUPLICADO' // con `persona` ({ id, nombre, apellido })
  // spec 007 — contracts/codigo-ingreso-api.md
  | 'CODIGO_INCORRECTO'
  | 'CODIGO_SIN_INTENTOS'
  | 'CODIGO_VENCIDO'
  | 'DEMASIADOS_PEDIDOS' // también "Contanos qué te parece" (013)
  | 'ENVIO_EMAIL_FALLIDO'
  // spec 008 — tasks T005
  | 'VIDA_SERVICIO_PRERREQUISITO_NO_CUMPLIDO' // FR-008
  | 'SOLICITUD_VIDA_SERVICIO_YA_PENDIENTE' // FR-012
  | 'VIDA_SERVICIO_EN_CURSO_O_COMPLETADA' // FR-010
  | 'CONTENIDO_NO_DISPONIBLE' // FR-021, FR-024
  | 'GRUPO_NO_ENCONTRADO'
  | 'GRUPO_NO_EN_CURSO' // FR-037
  | 'SEMANA_NO_ENCONTRADA'
  | 'SEMANA_LIBERADA_NO_EDITABLE' // FR-004
  | 'SEMANA_CON_MATERIAL' // FR-004
  | 'ULTIMO_LIDER' // FR-005
  | 'YA_ES_LIDER' // FR-005
  | 'INSCRIPCION_NO_ACTIVA' // FR-032, FR-033
  | 'FINALIZACION_ANTES_DE_TIEMPO' // FR-035
  | 'BAJAS_PROPUESTAS_SIN_RESOLVER' // FR-036
  | 'LIDER_TIENE_GRUPOS_ACTIVOS' // FR-040, D167
  // spec 009 — contracts/ministerios-api.md, postulaciones-api.md
  | 'MINISTERIO_NO_DISPONIBLE'
  | 'MINISTERIO_INACTIVO' // FR-029
  | 'MINISTERIO_TIENE_DATOS_RELACIONADOS' // D119
  | 'CELULA_TIENE_DATOS_RELACIONADOS' // D119
  | 'CONFIRMACION_NOMBRE_REQUERIDA' // D38
  | 'POSTULACION_NO_APROBADA' // FR-025
  | 'NO_APTA_PARA_MINISTERIO' // FR-002
  | 'YA_ES_MIEMBRO_DEL_MINISTERIO' // FR-004
  | 'POSTULACION_YA_PENDIENTE' // FR-003
  | 'POSTULACION_NO_PENDIENTE'
  | 'POSTULACION_REQUIERE_CONFIRMAR_CAMBIO' // FR-019, D173
  // spec 010 — contracts/bautismo-api.md
  | 'BAUTISMO_NO_HABILITADO' // FR-002
  | 'EDAD_INSUFICIENTE_PARA_PEDIR_BAUTISMO_SOLO' // FR-003, D184
  | 'SOLICITUD_BAUTISMO_YA_ABIERTA' // FR-004
  | 'PERSONA_YA_BAUTIZADA' // FR-005
  | 'SOLICITUD_BAUTISMO_YA_CAMBIO' // FR-010
  | 'EVENTO_NO_ES_DE_BAUTISMO' // FR-012
  | 'EVENTO_NO_DISPONIBLE_PARA_ASIGNAR' // FR-012
  | 'EVENTO_TODAVIA_NO_OCURRIO' // FR-027
  // spec 011 — contracts/eventos-api.md, inscripciones-api.md, pagos-api.md
  | 'FLYER_TIPO_INVALIDO' // FR-012
  | 'FLYER_TAMANO_EXCEDIDO'
  | 'FLYER_DIMENSION_INSUFICIENTE'
  | 'CUPO_MENOR_A_OCUPADOS' // FR-014
  | 'LISTA_ESPERA_CON_PERSONAS' // FR-014
  | 'EVENTO_CON_INSCRIPCIONES' // FR-014, FR-042
  | 'EVENTO_CON_PAGOS' // FR-014
  | 'EVENTO_CANCELADO'
  | 'EVENTO_NO_CANCELADO'
  | 'EVENTO_YA_PASO' // FR-041
  | 'CONFIG_BAUTISMO_INVALIDA' // FR-045
  | 'CUPO_LLENO' // FR-015
  | 'EVENTO_NO_ADMITE_INSCRIPCION'
  | 'EVENTO_YA_EMPEZO' // FR-019
  | 'EVENTO_SOLO_INSCRIBE_ADMIN' // FR-046
  | 'INSCRIPCION_EVENTO_YA_ABIERTA' // FR-021
  | 'PERSONA_NO_ACTIVA' // FR-015, FR-027
  | 'INSCRIPCION_NO_PENDIENTE'
  | 'INSCRIPCION_NO_ABIERTA'
  | 'COMPROBANTE_TIPO_INVALIDO' // FR-031
  | 'COMPROBANTE_TAMANO_EXCEDIDO'
  | 'EVENTO_SIN_COSTO'
  | 'INSCRIPCION_NO_CONFIRMADA'
  | 'PAGO_PENDIENTE_EXISTENTE' // FR-030
  | 'PAGO_NO_PENDIENTE'
  // spec 011, ampliación 2026-10-09 (D220–D223)
  | 'EVENTO_NO_CORRESPONDE' // FR-061: no está entre los destinatarios
  | 'PREGUNTA_CON_RESPUESTAS' // FR-066: no se borra ni cambia de tipo
  // spec 012
  | 'NOTIFICACION_SIN_DESTINATARIOS' // FR-029
  | 'ALCANCE_NO_DISPONIBLE' // FR-027
  // spec 013
  | 'CURSO_INACTIVO' // FR-054, D212
  | 'CURSO_TIENE_GRUPOS' // D119
  | 'CURSO_NO_RECONOCIDO' // FR-056
  | 'CURSO_YA_EXISTE' // FR-056
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
