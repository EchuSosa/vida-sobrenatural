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
