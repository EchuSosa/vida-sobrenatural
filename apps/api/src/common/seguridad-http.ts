import type { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';
import { cabecerasDeSeguridadApi, origenesCors, type Entorno } from '@vida-sobrenatural/shared-types';

/**
 * docs/25, S-04 y S-08 (Echu, 2026-11-03): cabeceras de seguridad y CORS de la API, por variable
 * de entorno con valores de producción por defecto (`cabeceras-seguridad.ts` en shared-types).
 * La API solo usa `Bearer`, nunca cookies: CORS no lleva `credentials`.
 */
export function configurarSeguridadHttp(app: NestExpressApplication, env: Entorno = process.env): void {
  const cabeceras = cabecerasDeSeguridadApi(env);
  app.use((_req: Request, res: Response, next: NextFunction) => {
    for (const [nombre, valor] of cabeceras) res.setHeader(nombre, valor);
    next();
  });
  const origenes = origenesCors(env);
  app.enableCors({ origin: origenes === true ? true : origenes });
}
