import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { AppModule } from '../../src/app.module.js';
import { configurarApp } from '../../src/configurar-app.js';
import { configurarSeguridadHttp } from '../../src/common/seguridad-http.js';

/** docs/25, S-04 y S-08: con un entorno de producción, la API manda sus cabeceras y CORS solo deja a la web y al backoffice. */
describe('Cabeceras de seguridad y CORS de la API (docs/25)', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = modulo.createNestApplication<NestExpressApplication>();
    configurarApp(app);
    configurarSeguridadHttp(app, { NODE_ENV: 'production', WEB_URL: 'https://web.ejemplo.org', BACKOFFICE_URL: 'https://bo.ejemplo.org' });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('cada respuesta lleva las cabeceras de seguridad', async () => {
    const r = await request(app.getHttpServer()).get('/sedes');
    expect(r.headers['x-content-type-options']).toBe('nosniff');
    expect(r.headers['x-frame-options']).toBe('DENY');
    expect(r.headers['referrer-policy']).toBe('no-referrer');
    expect(r.headers['strict-transport-security']).toBe('max-age=31536000; includeSubDomains');
  });

  it('CORS: la web sí; otro origen no recibe permiso', async () => {
    const web = await request(app.getHttpServer()).options('/sedes').set('Origin', 'https://web.ejemplo.org').set('Access-Control-Request-Method', 'GET');
    expect(web.headers['access-control-allow-origin']).toBe('https://web.ejemplo.org');
    const ajeno = await request(app.getHttpServer()).options('/sedes').set('Origin', 'https://ajeno.org').set('Access-Control-Request-Method', 'GET');
    expect(ajeno.headers['access-control-allow-origin']).toBeUndefined();
  });
});
