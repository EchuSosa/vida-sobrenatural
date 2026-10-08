'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { AuthError, CredentialsSignin } from 'next-auth';
import { normalizarEmail } from '@vida-sobrenatural/shared-types';
import { pedirCodigoIngreso } from '@vida-sobrenatural/shared-types/auth-server';
import type { ResultadoIngreso } from '@vida-sobrenatural/ui';
import { signIn } from '../auth';

/**
 * spec 007 (T035, contracts/nextauth-codigo-email.md) — las acciones del
 * ingreso con código del backoffice. Sin cookie: los dos pasos están en la
 * misma pantalla (`PantallaSinSesion`) y el email vive en el estado del
 * formulario. Nada de esto se loguea (FR-020).
 */

async function origenCliente(): Promise<string> {
  const h = await headers();
  const reenviado = h.get('x-forwarded-for')?.split(',')[0]?.trim();
  return reenviado || h.get('x-real-ip')?.trim() || 'desconocido';
}

/** Solo una ruta interna del backoffice; cualquier otra cosa vuelve a la raíz. */
function rutaInterna(destino: string | undefined): string {
  if (typeof destino !== 'string' || !destino.startsWith('/') || destino.startsWith('//') || destino.startsWith('/\\')) return '/';
  return destino;
}

export async function pedirCodigo(email: string): Promise<ResultadoIngreso> {
  return pedirCodigoIngreso(normalizarEmail(String(email ?? '')), await origenCliente());
}

/**
 * Entra con el código y vuelve a la ruta en la que estaba (H-116), con una
 * carga completa de la página (la devuelve en `redirigirA`: la sesión nueva
 * tiene que llegar también al `SessionProvider`). Un error del
 * código vuelve al campo. Si el callback `signIn` rechaza el ingreso
 * (`pendiente_tutor`, email sin verificar) o la API no responde, el resultado
 * es el mismo que hoy con Google: la pantalla de error de Auth.js del
 * backoffice (`pages.error = '/'`, con `?error=`).
 */
export async function verificarCodigo(email: string, codigo: string, destino?: string): Promise<ResultadoIngreso> {
  let url: string;
  try {
    url = await signIn('codigo-email', {
      email: normalizarEmail(String(email ?? '')),
      codigo: String(codigo ?? ''),
      redirectTo: rutaInterna(destino),
      redirect: false,
    });
  } catch (error) {
    if (error instanceof CredentialsSignin) {
      return { errores: [{ campo: 'codigo', code: error.code }] };
    }
    if (error instanceof AuthError) redirect(`/?error=${encodeURIComponent(error.type)}`);
    throw error;
  }
  const destinoFinal = new URL(url, 'http://local');
  return { ok: true, redirigirA: `${destinoFinal.pathname}${destinoFinal.search}` };
}
