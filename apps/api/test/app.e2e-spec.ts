import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { Server } from 'node:http';
import { AppModule } from './../src/app.module.js';
import { configurarApp } from '../src/configurar-app.js';

/**
 * H-120: `supertest/types` (el scaffold que trae `nest new`) no existe
 * como subpath real del paquete `supertest` instalado (7.2.2) — no tiene
 * `exports` ni un archivo `types.js`/`types.d.ts` propio; verificado
 * mirando `node_modules/supertest` directo, no de memoria.
 * `@types/supertest` SÍ tiene un `App` interno, pero es un archivo propio
 * del paquete de tipos (`@types/supertest/types.d.ts`), no algo pensado
 * para importarse desde código de consumidor. `Server` de `node:http` es
 * lo que `getHttpServer()` devuelve en los hechos (Express por debajo de
 * NestJS) y es asignable al `App` que espera `request()` de supertest
 * (unión que incluye `net.Server`, del que `http.Server` hereda) — sin
 * import roto, sin `any`.
 */
describe('AppController (e2e)', () => {
  let app: INestApplication<Server>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configurarApp(app);
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  afterEach(async () => {
    await app.close();
  });
});
