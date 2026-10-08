import type { SeccionPerfil } from './tipos';
import { SeccionCamino } from './seccion-camino';

/**
 * Lote 0 global (spec 013, research #5): las secciones que suman otras specs
 * al Perfil de Persona, en el orden en que se muestran. La 013 (lote 2) arma
 * la página y sus secciones propias (Datos, Roles, Solicitudes, Grupos,
 * Familia) y recorre esta lista. Cada spec agrega SU línea cuando su sección
 * tenga contenido (`seccion-camino.tsx` 006, `seccion-vida-de-servicio.tsx` 008,
 * `seccion-ministerios.tsx` 009, `seccion-bautismo.tsx` 010,
 * `seccion-eventos.tsx` 011), en ese orden.
 */
export const SECCIONES_PERFIL: SeccionPerfil[] = [
  // spec 006 (T047): las cuatro etapas, registrar como hecha y anular.
  { clave: 'etapas', tituloKey: 'etapasPersona.titulo', permiso: 'personas.ver', Componente: SeccionCamino },
];
