'use server';

import { headers } from 'next/headers';
import type { ComentarioNuevo } from '@vida-sobrenatural/shared-types';
import { enviarComentarioApi, origenDeHeaders, type ResultadoComentario } from '@vida-sobrenatural/shared-types/auth-server';
import { auth } from '../auth';

/**
 * spec 013 (T065): "Contanos qué te parece" desde el menú de usuario del
 * backoffice — como en la web, lo manda el servidor con la IP de origen y el
 * token de la Persona (queda a su nombre, `app = backoffice`).
 */
export async function enviarComentarioBackoffice(datos: ComentarioNuevo): Promise<ResultadoComentario> {
  const session = await auth();
  const token = session?.user.personaId ? session.apiToken : null;
  return enviarComentarioApi({ ...datos, app: 'backoffice' }, origenDeHeaders(await headers()), token);
}
