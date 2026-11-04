import { cache } from 'react';
import { apiFetch, type PersonaPerfil } from '@vida-sobrenatural/shared-types';

/**
 * BUG-10 (QA ronda 2, D268): el nombre con el que se presenta quien escribe por WhatsApp ("Hola
 * Sofía, soy Carolina…"). Sale de la Persona, no de la sesión: con el ingreso por código la sesión
 * no tiene nombre, y el de Google puede no ser el que la iglesia conoce. Si no se puede leer, '' y
 * la pantalla usa el saludo sin nombre (la frase no queda rota). `cache`: una vez por pedido.
 */
export const nombreDeQuienMira = cache(async (apiToken: string | undefined): Promise<string> => {
  if (!apiToken) return '';
  try {
    const perfil = await apiFetch<PersonaPerfil>('/personas/me', { headers: { Authorization: `Bearer ${apiToken}` }, cache: 'no-store' });
    return perfil.nombre?.trim() ?? '';
  } catch {
    return '';
  }
});
