'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { AuthError, CredentialsSignin } from 'next-auth';
import { CODIGO_INGRESO_VIDA_MIN, destinoSeguro, normalizarEmail } from '@vida-sobrenatural/shared-types';
import { pedirCodigoIngreso } from '@vida-sobrenatural/shared-types/auth-server';
import type { ResultadoIngreso } from '@vida-sobrenatural/ui';
import { signIn } from '../../../auth';
import { COOKIE_EMAIL_INGRESO } from './cookie';

/**
 * spec 007 (T020, contracts/nextauth-codigo-email.md) — las dos acciones del
 * ingreso con código de la web.
 *
 * El email viaja entre `/ingresar` y `/ingresar/codigo` en una cookie
 * `httpOnly` de 15 minutos, no en la URL (no queda en el historial ni en los
 * logs, research.md #11). Nada de esto se loguea (FR-020).
 */

async function origenCliente(): Promise<string> {
  const h = await headers();
  const reenviado = h.get('x-forwarded-for')?.split(',')[0]?.trim();
  return reenviado || h.get('x-real-ip')?.trim() || 'desconocido';
}

export async function pedirCodigo(emailCrudo: string): Promise<ResultadoIngreso> {
  const email = normalizarEmail(String(emailCrudo ?? ''));
  const resultado = await pedirCodigoIngreso(email, await origenCliente());
  if (!resultado.ok) return resultado;
  (await cookies()).set(COOKIE_EMAIL_INGRESO, email, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/ingresar',
    maxAge: CODIGO_INGRESO_VIDA_MIN * 60,
  });
  return { ok: true };
}

/**
 * Entra con el código. Si sale bien, devuelve a dónde ir — `/ingresar` (con el
 * `destino` si lo hay), que resuelve activa / pendiente_tutor / sin Persona
 * (H-85), o la pantalla a la que mandó el callback `signIn` (p. ej.
 * `/pendiente-tutor`) — y el formulario navega con una carga completa: un
 * `redirect()` desde acá sería una navegación del lado del cliente y el
 * `SessionProvider` seguiría sin sesión (el registro la vería "sin sesión"). Un error del código vuelve al campo; cualquier otro error de Auth.js
 * (la API no respondió) bloquea el ingreso: pantalla de error de
 * verificación (D88, FR-015).
 */
export async function verificarCodigo(_email: string, codigo: string, destino?: string): Promise<ResultadoIngreso> {
  const almacen = await cookies();
  const email = almacen.get(COOKIE_EMAIL_INGRESO)?.value;
  if (!email) return { errores: [{ campo: 'codigo', code: 'CODIGO_VENCIDO' }] };

  const vuelta = destino ? `/ingresar?destino=${encodeURIComponent(destinoSeguro(destino))}` : '/ingresar';
  let url: string;
  try {
    url = await signIn('codigo-email', { email, codigo: String(codigo ?? ''), redirectTo: vuelta, redirect: false });
  } catch (error) {
    if (error instanceof CredentialsSignin) {
      return { errores: [{ campo: 'codigo', code: error.code }] };
    }
    if (error instanceof AuthError) redirect('/error-verificacion');
    throw error;
  }
  almacen.delete({ name: COOKIE_EMAIL_INGRESO, path: '/ingresar' });
  const destinoFinal = new URL(url, 'http://local');
  return { ok: true, redirigirA: `${destinoFinal.pathname}${destinoFinal.search}` };
}

/** "Usar otro email": olvida el email pedido y vuelve al primer paso. */
export async function usarOtroEmail(destino?: string): Promise<void> {
  (await cookies()).delete({ name: COOKIE_EMAIL_INGRESO, path: '/ingresar' });
  redirect(destino ? `/ingresar?destino=${encodeURIComponent(destinoSeguro(destino))}` : '/ingresar');
}
