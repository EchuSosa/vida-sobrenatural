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

  constructor(
    code: ErrorCode,
    status: number,
    detail: string,
    errors?: AppExceptionErrorField[],
  ) {
    super(detail, status);
    this.code = code;
    this.errors = errors;
  }
}
