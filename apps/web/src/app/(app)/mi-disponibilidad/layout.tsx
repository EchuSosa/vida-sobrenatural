import type { ReactNode } from 'react';
import { requerirPermiso } from '../../../auth';

/** spec 006 (FR-024): el permiso antes del `loading.tsx` (ver `mis-discipulados/layout.tsx`). */
export default async function MiDisponibilidadLayout({ children }: { children: ReactNode }) {
  await requerirPermiso('mi_disponibilidad.ver');
  return children;
}
