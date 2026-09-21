import type { ErrorCode } from './error-code.js';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3333';

export interface ApiFieldError {
  campo: string;
  code: string;
}

/**
 * Error normalizado a partir de una respuesta Problem Details de la API —
 * specs/002-base-transversal/contracts/errores.md (research.md, Decisión 7).
 * El componente que llama a `apiFetch` traduce `code` con `next-intl`
 * (namespace "errors") — este cliente no traduce nada.
 *
 * H-41 (revisión manual, revisión de código): un solo cliente para
 * `apps/web` y `apps/backoffice` — antes eran 53 líneas idénticas
 * duplicadas a mano en cada app (mismo riesgo de divergencia que H-33).
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
    // Falla de red (sin conexión, API caída) — sin requestId porque nunca
    // llegó a responder.
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
