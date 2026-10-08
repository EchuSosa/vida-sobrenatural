import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import * as Sentry from '@sentry/nestjs';
import type { ErrorCode } from '@vida-sobrenatural/shared-types';
import { AppException, type AppExceptionErrorField } from './app-exception.js';

/**
 * `id`/`log` los agrega pino-http (main.ts) por-request — ausentes en tests
 * que no montan ese middleware, de ahí el `?`. Intersección en vez de
 * `extends Request` para no chocar con la propia augmentación global de
 * tipos de pino-http sobre `http.IncomingMessage`.
 */
type RequestConId = Request & {
  id?: string;
  log?: { error: (obj: Record<string, unknown>, msg?: string) => void };
};

interface ErrorNormalizado {
  status: number;
  code: ErrorCode;
  detail: string;
  errors?: AppExceptionErrorField[];
  extensiones?: Record<string, unknown>;
}

const PRISMA_NOT_FOUND = 'P2025';

const TITULOS: Record<ErrorCode, string> = {
  NO_AUTENTICADO: 'No autenticado',
  SIN_PERMISO: 'Sin permiso',
  NO_ENCONTRADO: 'No encontrado',
  VALIDACION: 'Error de validación',
  EMAIL_DUPLICADO: 'Email ya registrado',
  SEDE_INVALIDA: 'Sede inválida',
  SEDE_NOMBRE_DUPLICADO: 'Ya existe una Sede activa con ese nombre',
  CONTACTO_SEDE_REQUERIDO: 'Falta un dato de contacto de la Sede',
  CONSENTIMIENTO_REQUERIDO: 'Consentimiento requerido',
  PERSONA_NO_PENDIENTE_TUTOR: 'Persona no está pendiente_tutor',
  VERIFICACION_LOGIN_FALLIDA: 'No se pudo verificar el login',
  // No se lanza desde apps/api — la rechaza NextAuth antes de llegar acá
  // (specs/001-fase-bienvenida/contracts/auth-integration.md) — pero el
  // Record<ErrorCode, string> es exhaustivo, así que necesita su título igual.
  EMAIL_NO_VERIFICADO: 'Email no verificado',
  ACTIVAR_TUTOR_INVALIDO: 'Datos de tutor inválidos',
  RELACION_FAMILIAR_INVALIDA: 'Relación familiar inválida',
  TUTOR_INVALIDO: 'Tutor inválido',
  SEDE_UNICA_ACTIVA: 'Es la única Sede activa',
  SEDE_TIENE_DATOS_RELACIONADOS: 'No se puede eliminar: tiene datos relacionados',
  YOUTUBE_URL_INVALIDA: 'URL de YouTube inválida',
  PORTADA_TIPO_INVALIDO: 'Tipo de archivo inválido',
  PORTADA_TAMANO_EXCEDIDO: 'Archivo demasiado pesado',
  LIBRO_TEXTO_ALTERNATIVO_REQUERIDO: 'Falta el texto alternativo',
  PORTADA_DIMENSION_INSUFICIENTE: 'Imagen demasiado chica',
  LIBRO_ORDEN_CONJUNTO_INVALIDO: 'Conjunto de orden inválido',
  // specs/005-roles-permisos-acceso (D131/D133/H-127).
  PERSONA_MENOR_DE_EDAD_NO_PUEDE_TENER_ROL_DE_CARGO: 'La Persona es menor de edad',
  NO_SE_PUEDE_DEGRADAR_AL_ADMIN_SEMBRADO: 'No se puede degradar al Admin sembrado',
  ADMIN_NO_PUEDE_AUTO_REVOCARSE: 'Un Admin no puede quitarse su propio rol',
  SESION_SIN_PERSONA: 'La sesión no tiene una Persona asociada',
  DISCIPULADOR_TIENE_DISCIPULADOS_ACTIVOS: 'Tiene discipulados activos a cargo',
  // specs/004-vida-nueva-discipulado.
  SOLICITUD_DISCIPULADO_YA_PENDIENTE: 'Ya tenés un pedido de Vida Nueva en curso',
  VIDA_NUEVA_EN_CURSO_O_COMPLETADA: 'Ya estás cursando o completaste Vida Nueva',
  EDAD_INSUFICIENTE_PARA_PEDIR_SOLO: 'Este pedido lo hace tu mamá, papá o tutor',
  SOLICITUD_NO_PENDIENTE: 'La Solicitud ya no está pendiente',
  SOLICITUD_NO_PROPUESTA: 'La Solicitud no tiene una propuesta en curso',
  DISCIPULADOR_NO_DISPONIBLE: 'El Discipulador ya no está disponible',
  GRUPO_SIN_LUGAR: 'El Grupo no tiene lugar',
  PROPUESTA_NO_VIGENTE: 'La propuesta ya no está vigente',
  DISCIPULADO_NO_EN_CURSO: 'El discipulado no está en curso',
  FINALIZACION_NO_PROPUESTA: 'No hay una finalización propuesta',
  FINALIZACION_YA_PROPUESTA: 'La finalización ya está propuesta',
  BAJA_NO_PROPUESTA: 'No hay una baja propuesta',
  BAJA_YA_PROPUESTA: 'La baja ya está propuesta',
  REASIGNACION_AL_MISMO_DISCIPULADOR: 'Es el Discipulador actual',
  REASIGNACION_YA_PROPUESTA: 'La reasignación ya está propuesta',
  // Lote 0 global (specs 006–013).
  DECLARACION_YA_PENDIENTE: 'Ya hay una declaración pendiente de esa etapa',
  ETAPA_YA_COMPLETADA: 'La etapa ya está completada',
  ETAPA_EN_CURSO: 'La etapa está en curso',
  DECLARACION_NO_PENDIENTE: 'La declaración ya no está pendiente',
  COMPLETITUD_NO_VIGENTE: 'La etapa registrada ya estaba anulada',
  HISTORIAL_VIDA_NUEVA_EN_REVISION: 'Hay una declaración de Vida Nueva en revisión',
  VIDA_NUEVA_COMPLETADA_POR_HISTORIAL: 'Vida Nueva ya está registrada por la iglesia',
  POSIBLE_DUPLICADO: 'Posible persona duplicada',
  EMAIL_YA_CARGADO: 'La Persona ya tiene email',
  DNI_INVALIDO: 'DNI inválido',
  DNI_DUPLICADO: 'Ya hay una Persona con este DNI',
  CODIGO_INCORRECTO: 'Código incorrecto',
  CODIGO_SIN_INTENTOS: 'Sin intentos',
  CODIGO_VENCIDO: 'Código vencido o ya usado',
  DEMASIADOS_PEDIDOS: 'Demasiados pedidos',
  ENVIO_EMAIL_FALLIDO: 'No se pudo enviar el email',
  VIDA_SERVICIO_PRERREQUISITO_NO_CUMPLIDO: 'Falta completar Vida Nueva',
  SOLICITUD_VIDA_SERVICIO_YA_PENDIENTE: 'Ya hay un pedido de Vida de Servicio pendiente',
  VIDA_SERVICIO_EN_CURSO_O_COMPLETADA: 'Vida de Servicio en curso o completada',
  CONTENIDO_NO_DISPONIBLE: 'El material no está disponible',
  GRUPO_NO_ENCONTRADO: 'Grupo no encontrado',
  GRUPO_NO_EN_CURSO: 'El grupo ya terminó',
  SEMANA_NO_ENCONTRADA: 'Semana no encontrada',
  SEMANA_LIBERADA_NO_EDITABLE: 'La semana ya se liberó',
  SEMANA_CON_MATERIAL: 'La semana tiene material',
  ULTIMO_LIDER: 'Es el último Líder',
  YA_ES_LIDER: 'Ya es Líder de esta edición',
  INSCRIPCION_NO_ACTIVA: 'La inscripción no está activa',
  FINALIZACION_ANTES_DE_TIEMPO: 'Todavía no se puede cerrar',
  BAJAS_PROPUESTAS_SIN_RESOLVER: 'Hay bajas propuestas sin resolver',
  LIDER_TIENE_GRUPOS_ACTIVOS: 'Lidera ediciones en curso',
  MINISTERIO_NO_DISPONIBLE: 'Ministerio no disponible',
  MINISTERIO_INACTIVO: 'El Ministerio está inactivo',
  MINISTERIO_TIENE_DATOS_RELACIONADOS: 'No se puede eliminar: tiene postulaciones',
  CELULA_TIENE_DATOS_RELACIONADOS: 'No se puede eliminar: tiene postulaciones',
  CONFIRMACION_NOMBRE_REQUERIDA: 'Falta confirmar con el nombre',
  POSTULACION_NO_APROBADA: 'La postulación no está aprobada',
  NO_APTA_PARA_MINISTERIO: 'Todavía no puede postularse',
  YA_ES_MIEMBRO_DEL_MINISTERIO: 'Ya es parte de ese Ministerio',
  POSTULACION_YA_PENDIENTE: 'Ya hay una postulación pendiente',
  POSTULACION_NO_PENDIENTE: 'La postulación ya no está pendiente',
  POSTULACION_REQUIERE_CONFIRMAR_CAMBIO: 'La persona ya pertenece a otro Ministerio',
  BAUTISMO_NO_HABILITADO: 'Todavía no puede pedir el bautismo',
  EDAD_INSUFICIENTE_PARA_PEDIR_BAUTISMO_SOLO: 'Lo pide su tutor',
  SOLICITUD_BAUTISMO_YA_ABIERTA: 'Ya hay un pedido de bautismo abierto',
  PERSONA_YA_BAUTIZADA: 'La persona ya se bautizó',
  SOLICITUD_BAUTISMO_YA_CAMBIO: 'El pedido ya cambió',
  EVENTO_NO_ES_DE_BAUTISMO: 'No es un Evento de bautismo',
  EVENTO_NO_DISPONIBLE_PARA_ASIGNAR: 'El Evento no admite asignaciones',
  EVENTO_TODAVIA_NO_OCURRIO: 'El Evento todavía no ocurrió',
  FLYER_TIPO_INVALIDO: 'Tipo de flyer inválido',
  FLYER_TAMANO_EXCEDIDO: 'Flyer demasiado pesado',
  FLYER_DIMENSION_INSUFICIENTE: 'Flyer demasiado chico',
  CUPO_MENOR_A_OCUPADOS: 'El cupo es menor a los lugares ocupados',
  LISTA_ESPERA_CON_PERSONAS: 'Hay personas en lista de espera',
  EVENTO_CON_INSCRIPCIONES: 'El Evento tiene inscripciones',
  EVENTO_CON_PAGOS: 'El Evento tiene pagos',
  EVENTO_CANCELADO: 'El Evento está cancelado',
  EVENTO_NO_CANCELADO: 'El Evento no está cancelado',
  EVENTO_YA_PASO: 'El Evento ya pasó',
  CONFIG_BAUTISMO_INVALIDA: 'Configuración inválida para un bautismo',
  CUPO_LLENO: 'Cupo completo',
  EVENTO_NO_ADMITE_INSCRIPCION: 'El Evento no tiene inscripción',
  EVENTO_YA_EMPEZO: 'El Evento ya empezó',
  EVENTO_SOLO_INSCRIBE_ADMIN: 'Solo el equipo inscribe',
  INSCRIPCION_EVENTO_YA_ABIERTA: 'Ya hay una inscripción abierta',
  PERSONA_NO_ACTIVA: 'La persona no está activa',
  INSCRIPCION_NO_PENDIENTE: 'La inscripción no está pendiente',
  INSCRIPCION_NO_ABIERTA: 'La inscripción no está abierta',
  COMPROBANTE_TIPO_INVALIDO: 'Tipo de comprobante inválido',
  COMPROBANTE_TAMANO_EXCEDIDO: 'Comprobante demasiado pesado',
  EVENTO_SIN_COSTO: 'El Evento no tiene costo',
  INSCRIPCION_NO_CONFIRMADA: 'La inscripción no está confirmada',
  PAGO_PENDIENTE_EXISTENTE: 'Ya hay un pago en revisión',
  PAGO_NO_PENDIENTE: 'El pago ya se revisó',
  NOTIFICACION_SIN_DESTINATARIOS: 'No hay destinatarios',
  ALCANCE_NO_DISPONIBLE: 'Destinatario no disponible',
  CURSO_INACTIVO: 'El Curso está inactivo',
  CURSO_TIENE_GRUPOS: 'No se puede eliminar: tiene Grupos',
  CURSO_NO_RECONOCIDO: 'Curso no reconocido',
  CURSO_YA_EXISTE: 'El Curso ya existe',
  ERROR_INTERNO: 'Error interno',
};

/**
 * Filtro global — normaliza cualquier excepción a Problem Details (RFC 9457)
 * con `code` y `requestId`. Ver contracts/errores.md de
 * specs/002-base-transversal (research.md, Decisión 5).
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('AllExceptionsFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestConId>();
    const requestId = request.id ?? 'sin-id';

    const { status, code, detail, errors, extensiones } = this.normalizar(exception);

    if (status >= 500) {
      if (request.log) {
        request.log.error({ requestId, err: exception }, detail);
      } else {
        this.logger.error(`[${requestId}] ${detail}`, exception instanceof Error ? exception.stack : undefined);
      }
      Sentry.captureException(exception, { tags: { requestId } });
    }

    response.status(status).json({
      // Primero las extensiones: los miembros estándar de abajo las pisan si
      // alguna se llamara igual (RFC 9457 §3.2).
      ...extensiones,
      type: `https://vidasobrenatural.app/errores/${code.toLowerCase().replace(/_/g, '-')}`,
      title: TITULOS[code],
      status,
      code,
      detail,
      requestId,
      ...(errors ? { errors } : {}),
    });
  }

  private normalizar(exception: unknown): ErrorNormalizado {
    if (exception instanceof AppException) {
      return {
        status: exception.getStatus(),
        code: exception.code,
        detail: exception.message,
        errors: exception.errors,
        extensiones: exception.extensiones,
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      return { status, code: codigoParaStatus(status), detail: exception.message };
    }

    if (esErrorPrismaNoEncontrado(exception)) {
      return { status: 404, code: 'NO_ENCONTRADO', detail: 'El recurso solicitado no existe.' };
    }

    // Error no reconocido — nunca se expone el mensaje/stack original al cliente.
    return { status: 500, code: 'ERROR_INTERNO', detail: 'Ocurrió un error inesperado.' };
  }
}

function codigoParaStatus(status: number): ErrorCode {
  switch (status) {
    case 400:
      return 'VALIDACION';
    case 401:
      return 'NO_AUTENTICADO';
    case 403:
      return 'SIN_PERMISO';
    case 404:
      return 'NO_ENCONTRADO';
    default:
      return 'ERROR_INTERNO';
  }
}

function esErrorPrismaNoEncontrado(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: unknown }).code === PRISMA_NOT_FOUND
  );
}
