import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { AppException } from '../common/errors/app-exception.js';

/** La Persona de la sesión, o `SESION_SIN_PERSONA` (las acciones propias se autorizan por registro, FR-051). */
export function personaDeSesion(request: AuthenticatedRequest): string {
  if (!request.user.personaId) {
    throw new AppException('SESION_SIN_PERSONA', 403, 'La sesión no tiene una Persona asociada.');
  }
  return request.user.personaId;
}
