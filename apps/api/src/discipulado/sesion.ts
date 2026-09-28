import type { AuthenticatedRequest } from '../auth/authenticated-request.js';
import { AppException } from '../common/errors/app-exception.js';

/**
 * La Persona de la sesión (D134: todo lo del Discipulador sale de la sesión,
 * nunca de un id en la URL). Una sesión sin Persona no puede actuar: el
 * sistema no podría registrar quién lo hizo (H-140, mismo rechazo que roles).
 */
export function personaDeSesion(request: AuthenticatedRequest): string {
  const personaId = request.user?.personaId;
  if (!personaId) {
    throw new AppException(
      'SESION_SIN_PERSONA',
      403,
      'La sesión no tiene una Persona asociada: el sistema no puede registrar quién hace el cambio, así que no lo hace.',
    );
  }
  return personaId;
}
