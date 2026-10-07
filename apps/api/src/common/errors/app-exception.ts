import { HttpException } from '@nestjs/common';
import type { ErrorCode } from '@vida-sobrenatural/shared-types';

export interface AppExceptionErrorField {
  campo: string;
  code: string;
}

/**
 * Excepción de negocio con un `code` del catálogo compartido — ver
 * specs/002-base-transversal/contracts/errores.md y research.md Decisión 5.
 * `AllExceptionsFilter` la normaliza a Problem Details (RFC 9457).
 */
export class AppException extends HttpException {
  readonly code: ErrorCode;
  readonly errors?: AppExceptionErrorField[];
  /**
   * Miembros de extensión del Problem Details (RFC 9457 §3.2): datos que el
   * cliente necesita para actuar sobre el rechazo — ej. los discipulados que
   * traban quitar el rol discipulador (specs/004, FR-043). Van al nivel raíz
   * de la respuesta; nunca pisan los miembros estándar.
   */
  readonly extensiones?: Record<string, unknown>;

  constructor(
    code: ErrorCode,
    status: number,
    detail: string,
    errors?: AppExceptionErrorField[],
    extensiones?: Record<string, unknown>,
  ) {
    super(detail, status);
    this.code = code;
    this.errors = errors;
    this.extensiones = extensiones;
  }
}
