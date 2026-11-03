import { NextResponse } from 'next/server';
import { cabecerasDeSeguridadWeb } from '@vida-sobrenatural/shared-types';

/**
 * docs/25, S-04 (Echu, 2026-11-03): las cabeceras de seguridad de cada página, leídas del entorno
 * al arrancar el servidor (no en el build, para poder cambiarlas sin reconstruir la imagen). La
 * regla vive en shared-types (`cabecerasDeSeguridadWeb`), igual para web y backoffice; acá solo se
 * aplica.
 */
const CABECERAS = cabecerasDeSeguridadWeb(process.env);

export function proxy() {
  const respuesta = NextResponse.next();
  for (const [nombre, valor] of CABECERAS) respuesta.headers.set(nombre, valor);
  return respuesta;
}

export const config = {
  // Sin los recursos estáticos de Next ni las imágenes optimizadas: las cabeceras importan en las páginas.
  matcher: ['/((?!_next/static|_next/image).*)'],
};
