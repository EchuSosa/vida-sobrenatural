import type { ErrorCode } from '@vida-sobrenatural/shared-types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3333';

export interface ApiFieldError {
  campo: string;
  code: string;
}

/**
 * Error normalizado a partir de una respuesta Problem Details de la API —
 * mismo patrón que apps/web/src/lib/api-client.ts (specs/002-base-transversal,
 * contracts/errores.md). El componente que llama a `apiFetch` traduce
 * `code` con `next-intl` (namespace "errors") — este cliente no traduce
 * nada. H-29 (revisión manual, actualización 2026-09-20): backoffice no
 * tenía su propio cliente, cada página armaba su propio mensaje a mano.
 */
export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly requestId: string;
  readonly errors?: ApiFieldError[];

  constructor(code: ErrorCode, detail: string, requestId: string, errors?: ApiFieldError[]) {
    super(detail);
    this.code = code;
    this.requestId = requestId;
    this.errors = errors;
  }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, init);
  } catch {
    throw new ApiError('ERROR_INTERNO', 'No se pudo conectar con el servidor.', '');
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(
      body?.code ?? 'ERROR_INTERNO',
      body?.detail ?? 'Ocurrió un error inesperado.',
      body?.requestId ?? '',
      body?.errors,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}
