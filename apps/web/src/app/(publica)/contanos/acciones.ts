'use server';

import { headers } from 'next/headers';
import type { ComentarioNuevo } from '@vida-sobrenatural/shared-types';
import { enviarComentarioApi, origenDeHeaders, type ResultadoComentario } from '@vida-sobrenatural/shared-types/auth-server';
import { auth } from '../../../auth';

/**
 * spec 013 (T064, contracts/comentarios-api.md): manda el comentario desde el
 * servidor, con la IP como origen (para el límite por hora; la API guarda solo
 * su huella) y, si hay una Persona con sesión, su token de la API (D135): así
 * queda a su nombre y no se le piden datos de contacto. El texto no se loguea.
 */
export async function enviarComentario(datos: ComentarioNuevo): Promise<ResultadoComentario> {
  const session = await auth();
  const token = session?.user.personaId ? session.apiToken : null;
  return enviarComentarioApi({ ...datos, app: 'web' }, origenDeHeaders(await headers()), token);
}
