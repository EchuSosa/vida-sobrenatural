import { redirect } from 'next/navigation';
import { auth } from '../../../auth';

/**
 * H-85 (reabre H-64): destino real de `signIn('google', { callbackUrl:
 * '/ingresar' })` — el único botón de ingreso de toda la web, dentro del
 * formulario de registro. Antes el `callbackUrl` apuntaba directo a
 * `/registro`: cualquiera que ingresara, sea o no Miembro, volvía al
 * formulario, y el `useEffect` de ahí la rebotaba con el aviso "ya estás
 * registrada". El síntoma era el aviso; el bug era el destino.
 *
 * Acá se resuelve en el servidor, en un solo lugar, según el estado real
 * de la Persona — los tres únicos valores posibles de `session.user.estado`
 * (`packages/shared-types/src/auth-server.ts`):
 * - `activa` → `/inicio`.
 * - `pendiente_tutor` → `/pendiente-tutor` (ya interceptado antes, en el
 *   callback `signIn` de `auth.ts` — esto es una red adicional, no la
 *   única barrera).
 * - `null` (sin Persona todavía) → `/registro`, para completarlo — este es
 *   el único de los tres casos que sí tiene que llegar al formulario.
 *
 * El `useEffect` de `formulario-registro.tsx` que hacía esto mismo del
 * lado del cliente queda como red de seguridad, no como el camino normal.
 */
export default async function IngresarPage() {
  const session = await auth();

  if (session?.user.estado === 'activa') {
    redirect('/inicio');
  }
  if (session?.user.estado === 'pendiente_tutor') {
    redirect('/pendiente-tutor');
  }
  redirect('/registro');
}
