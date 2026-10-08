import type { ReactNode } from 'react';
import { requerirPermiso } from '../../../auth';

/**
 * spec 006 (FR-024): el permiso se exige ACÁ, antes del `loading.tsx` del
 * segmento. Si solo lo exigiera la página, la redirección a Mi camino llegaría
 * después de que el navegador ya pintó la carga (y cortara pedidos en vuelo);
 * en el layout es una redirección de verdad, sin mostrar nada.
 */
export default async function MisDiscipuladosLayout({ children }: { children: ReactNode }) {
  await requerirPermiso('mis_discipulados.ver');
  return children;
}
