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

    const { status, code, detail, errors } = this.normalizar(exception);

    if (status >= 500) {
      if (request.log) {
        request.log.error({ requestId, err: exception }, detail);
      } else {
        this.logger.error(`[${requestId}] ${detail}`, exception instanceof Error ? exception.stack : undefined);
      }
      Sentry.captureException(exception, { tags: { requestId } });
    }

    response.status(status).json({
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
