import type { ComponentType } from 'react';
import type { Permiso } from '@vida-sobrenatural/shared-types';

/**
 * Lote 0 global (spec 013, research #5): una sección del Perfil de Persona.
 * Cada sección carga y falla sola (la página la envuelve en `Suspense` y en su
 * propio error con "Reintentar"); llama a SU endpoint con el token de la sesión.
 */
export interface SeccionPerfil {
  /** Única; también es el `id` del encabezado de la sección. */
  clave: string;
  /** Clave de next-intl del título, en el namespace de la spec dueña. */
  tituloKey: string;
  /** Quién la ve (D132); el Pastor la ve en solo lectura si tiene el `.ver`. */
  permiso: Permiso;
  Componente: ComponentType<{ personaId: string; apiToken: string }>;
}
