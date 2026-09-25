import { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test, TestingModule } from '@nestjs/testing';
import { SignJWT } from 'jose';
import request from 'supertest';
import sharp from 'sharp';
import type { Server } from 'node:http';
import { AppModule } from '../../src/app.module.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import { configurarApp } from '../../src/configurar-app.js';

async function mintToken(rol: string[]): Promise<string> {
  const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
  return new SignJWT({ email: 'integ-libros@example.com', personaId: 'integ-libros', estado: 'activa', rol })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(secret);
}

// H-94: 1000×1500 (2:3, por encima del mínimo de 800×1200) — el mínimo en
// sí tiene sus propios tests en imagen-portada.spec.ts (unit); acá sólo
// hace falta que la imagen sea válida.
async function imagenSintetica(ancho = 1000, alto = 1500): Promise<Buffer> {
  return sharp({ create: { width: ancho, height: alto, channels: 3, background: { r: 10, g: 20, b: 30 } } })
    .jpeg()
    .toBuffer();
}

// FR-007/FR-008 (specs/003-contenido-institucional) — sólo las variantes de
// lectura en este tramo; las de escritura y portada (US4) van en la misma
// suite cuando se implementen esos endpoints.
describe('GET /libros (integración)', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;
  const idsCreados: string[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    configurarApp(app);
    await app.init();
    prisma = moduleFixture.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.libro.deleteMany({ where: { id: { in: idsCreados } } });
    await app.close();
  });

  it('estado=activas (default) excluye inactivos y eliminados', async () => {
    const activo = await prisma.libro.create({
      data: { titulo: `Integ activo ${Date.now()}`, autor: 'Autor', anio: 2020, activo: true },
    });
    const inactivo = await prisma.libro.create({
      data: { titulo: `Integ inactivo ${Date.now()}`, autor: 'Autor', anio: 2020, activo: false },
    });
    const eliminado = await prisma.libro.create({
      data: {
        titulo: `Integ eliminado ${Date.now()}`,
        autor: 'Autor',
        anio: 2020,
        activo: true,
        eliminadoEn: new Date(),
        eliminadoPor: 'admin-integ',
      },
    });
    idsCreados.push(activo.id, inactivo.id, eliminado.id);

    const response = await request(app.getHttpServer()).get('/libros?take=200');
    expect(response.status).toBe(200);
    const ids = response.body.items.map((l: { id: string }) => l.id);
    expect(ids).toContain(activo.id);
    expect(ids).not.toContain(inactivo.id);
    expect(ids).not.toContain(eliminado.id);
  });

  it('estado=todas incluye inactivos pero no eliminados (D117/D119)', async () => {
    const inactivo = await prisma.libro.create({
      data: { titulo: `Integ todas ${Date.now()}`, autor: 'Autor', anio: 2020, activo: false },
    });
    idsCreados.push(inactivo.id);

    const response = await request(app.getHttpServer()).get('/libros?estado=todas&take=200');
    expect(response.status).toBe(200);
    expect(response.body.items.map((l: { id: string }) => l.id)).toContain(inactivo.id);
  });

  it('GET /libros/papelera (Admin) devuelve los eliminados', async () => {
    const eliminado = await prisma.libro.create({
      data: {
        titulo: `Integ papelera ${Date.now()}`,
        autor: 'Autor',
        anio: 2020,
        eliminadoEn: new Date(),
        eliminadoPor: 'admin-integ',
      },
    });
    idsCreados.push(eliminado.id);

    const response = await request(app.getHttpServer())
      .get('/libros/papelera?take=100')
      .set('Authorization', `Bearer ${await mintToken(['admin'])}`);
    expect(response.status).toBe(200);
    expect(response.body.items.map((l: { id: string }) => l.id)).toContain(eliminado.id);
  });

  // H-129: la papelera es del Admin — antes el público la devolvía a
  // cualquiera, sin sesión. El listado público sigue sin guard.
  it('la papelera exige libros.papelera.ver: sin sesión 401, Pastor 403, y ?estado=papelera en el público da 400', async () => {
    const sinSesion = await request(app.getHttpServer()).get('/libros/papelera');
    expect(sinSesion.status).toBe(401);

    const pastor = await request(app.getHttpServer())
      .get('/libros/papelera')
      .set('Authorization', `Bearer ${await mintToken(['pastor'])}`);
    expect(pastor.status).toBe(403);
    expect(pastor.body.code).toBe('SIN_PERMISO');

    const porParametro = await request(app.getHttpServer()).get('/libros?estado=papelera');
    expect(porParametro.status).toBe(400);
    expect(porParametro.body.code).toBe('VALIDACION');
    expect(porParametro.body.errors).toEqual([{ campo: 'estado', code: 'ESTADO_INVALIDO' }]);

    const publico = await request(app.getHttpServer()).get('/libros');
    expect(publico.status).toBe(200);
  });

  it('GET /libros/:id devuelve 404 para uno eliminado (D119)', async () => {
    const eliminado = await prisma.libro.create({
      data: {
        titulo: `Integ detalle eliminado ${Date.now()}`,
        autor: 'Autor',
        anio: 2020,
        eliminadoEn: new Date(),
        eliminadoPor: 'admin-integ',
      },
    });
    idsCreados.push(eliminado.id);

    const response = await request(app.getHttpServer()).get(`/libros/${eliminado.id}`);
    expect(response.status).toBe(404);
    expect(response.body.code).toBe('NO_ENCONTRADO');
  });

  it('GET /libros/autores devuelve autores distintos, incluidos los de inactivos, sin los de eliminados (H-91)', async () => {
    const sufijo = Date.now();
    const activo = await prisma.libro.create({
      data: { titulo: `Integ autor activo ${sufijo}`, autor: `Autora Activa ${sufijo}`, anio: 2020, activo: true },
    });
    const inactivo = await prisma.libro.create({
      data: { titulo: `Integ autor inactivo ${sufijo}`, autor: `Autor Inactivo ${sufijo}`, anio: 2020, activo: false },
    });
    const eliminado = await prisma.libro.create({
      data: {
        titulo: `Integ autor eliminado ${sufijo}`,
        autor: `Autor Eliminado ${sufijo}`,
        anio: 2020,
        eliminadoEn: new Date(),
        eliminadoPor: 'admin-integ',
      },
    });
    idsCreados.push(activo.id, inactivo.id, eliminado.id);

    const response = await request(app.getHttpServer()).get('/libros/autores');
    expect(response.status).toBe(200);
    expect(response.body).toContain(`Autora Activa ${sufijo}`);
    expect(response.body).toContain(`Autor Inactivo ${sufijo}`);
    expect(response.body).not.toContain(`Autor Eliminado ${sufijo}`);
  });
});

describe('POST/PATCH/DELETE /libros (integración) — Historia 4', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  const idsCreados: string[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication<NestExpressApplication>();
    configurarApp(app);
    // T037/main.ts: la ruta estática de portadas no la agrega el módulo,
    // sólo bootstrap() — createNestApplication() no la ejecuta, así que
    // este test la repite (mismo criterio que los filtros/pipes de arriba).
    // H-130: sin default — load-test-env.cjs ya verificó en este worker que
    // STORAGE_DIR es la carpeta temporal de esta corrida.
    app.useStaticAssets(process.env.STORAGE_DIR as string, { prefix: '/archivos/portadas/' });
    await app.init();
    prisma = moduleFixture.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.libro.deleteMany({ where: { id: { in: idsCreados } } });
    await app.close();
  });

  it('Admin crea, edita, inactiva/reactiva y elimina un Libro — siempre permitido (FR-020), y se restaura', async () => {
    const token = await mintToken(['admin']);

    const crear = await request(app.getHttpServer())
      .post('/libros')
      .set('Authorization', `Bearer ${token}`)
      .send({ titulo: `Integ libro ${Date.now()}`, autor: 'Autor Integ', anio: 2020 });
    expect(crear.status).toBe(201);
    expect(crear.body.activo).toBe(true);
    idsCreados.push(crear.body.id);

    const editar = await request(app.getHttpServer())
      .patch(`/libros/${crear.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ orden: 5 });
    expect(editar.status).toBe(200);
    expect(editar.body.orden).toBe(5);

    const inactivar = await request(app.getHttpServer())
      .patch(`/libros/${crear.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ activo: false });
    expect(inactivar.status).toBe(200);
    expect(inactivar.body.activo).toBe(false);

    const reactivar = await request(app.getHttpServer())
      .patch(`/libros/${crear.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ activo: true });
    expect(reactivar.status).toBe(200);
    expect(reactivar.body.activo).toBe(true);

    const eliminar = await request(app.getHttpServer())
      .delete(`/libros/${crear.body.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(eliminar.status).toBe(200);

    const enPapelera = await request(app.getHttpServer()).get('/libros/papelera?take=100').set('Authorization', `Bearer ${token}`);
    expect(enPapelera.body.items.map((l: { id: string }) => l.id)).toContain(crear.body.id);

    const restaurar = await request(app.getHttpServer())
      .post(`/libros/${crear.body.id}/restaurar`)
      .set('Authorization', `Bearer ${token}`);
    expect(restaurar.status).toBe(201);
    expect(restaurar.body.eliminadoEn).toBeNull();
  });

  it('Pastor recibe 403 al intentar crear; otro rol también', async () => {
    const tokenPastor = await mintToken(['pastor']);
    const respuestaPastor = await request(app.getHttpServer())
      .post('/libros')
      .set('Authorization', `Bearer ${tokenPastor}`)
      .send({ titulo: 'No debería crearse', autor: 'X', anio: 2020 });
    expect(respuestaPastor.status).toBe(403);

    const tokenOtro = await mintToken(['discipulador']);
    const respuestaOtro = await request(app.getHttpServer())
      .post('/libros')
      .set('Authorization', `Bearer ${tokenOtro}`)
      .send({ titulo: 'No debería crearse', autor: 'X', anio: 2020 });
    expect(respuestaOtro.status).toBe(403);
  });

  it('sube una portada válida con texto alternativo, la sirve pública, y reemplazarla borra la anterior', async () => {
    const token = await mintToken(['admin']);
    const crear = await request(app.getHttpServer())
      .post('/libros')
      .set('Authorization', `Bearer ${token}`)
      .send({ titulo: `Integ portada ${Date.now()}`, autor: 'Autor', anio: 2020 });
    idsCreados.push(crear.body.id);

    const imagen1 = await imagenSintetica();
    const subida1 = await request(app.getHttpServer())
      .post(`/libros/${crear.body.id}/portada`)
      .set('Authorization', `Bearer ${token}`)
      .field('portadaDescripcion', 'Tapa del libro de prueba')
      .attach('portada', imagen1, { filename: 'portada.jpg', contentType: 'image/jpeg' });
    expect(subida1.status).toBe(201);
    expect(subida1.body.portadaUrl).toContain('/archivos/portadas/');
    expect(subida1.body.portadaDescripcion).toBe('Tapa del libro de prueba');
    const primeraUrl: string = subida1.body.portadaUrl;

    // El archivo resultante se sirve público, sin sesión (D110/FR-026).
    const servida = await request(app.getHttpServer()).get(new URL(primeraUrl).pathname);
    expect(servida.status).toBe(200);

    const imagen2 = await imagenSintetica(1600, 1600);
    const subida2 = await request(app.getHttpServer())
      .post(`/libros/${crear.body.id}/portada`)
      .set('Authorization', `Bearer ${token}`)
      .field('portadaDescripcion', 'Tapa reemplazada')
      .attach('portada', imagen2, { filename: 'portada2.jpg', contentType: 'image/jpeg' });
    expect(subida2.status).toBe(201);
    expect(subida2.body.portadaUrl).not.toBe(primeraUrl);

    // La anterior deja de servirse (Acceptance Scenario 4 de la Historia 4).
    const anteriorServida = await request(app.getHttpServer()).get(new URL(primeraUrl).pathname);
    expect(anteriorServida.status).toBe(404);

    const quitar = await request(app.getHttpServer())
      .delete(`/libros/${crear.body.id}/portada`)
      .set('Authorization', `Bearer ${token}`);
    expect(quitar.status).toBe(200);
    expect(quitar.body.portadaUrl).toBeNull();
    expect(quitar.body.portadaDescripcion).toBeNull();
  });

  it('rechaza un tipo de archivo inválido, un archivo demasiado pesado, y una portada sin texto alternativo', async () => {
    const token = await mintToken(['admin']);
    const crear = await request(app.getHttpServer())
      .post('/libros')
      .set('Authorization', `Bearer ${token}`)
      .send({ titulo: `Integ portada inválida ${Date.now()}`, autor: 'Autor', anio: 2020 });
    idsCreados.push(crear.body.id);

    const tipoInvalido = await request(app.getHttpServer())
      .post(`/libros/${crear.body.id}/portada`)
      .set('Authorization', `Bearer ${token}`)
      .field('portadaDescripcion', 'Texto')
      .attach('portada', Buffer.from('no es una imagen'), { filename: 'archivo.txt', contentType: 'text/plain' });
    expect(tipoInvalido.status).toBe(400);
    expect(tipoInvalido.body.code).toBe('PORTADA_TIPO_INVALIDO');

    const tamanoExcedido = await request(app.getHttpServer())
      .post(`/libros/${crear.body.id}/portada`)
      .set('Authorization', `Bearer ${token}`)
      .field('portadaDescripcion', 'Texto')
      .attach('portada', Buffer.alloc(6 * 1024 * 1024, 1), { filename: 'grande.jpg', contentType: 'image/jpeg' });
    expect(tamanoExcedido.status).toBe(400);
    expect(tamanoExcedido.body.code).toBe('PORTADA_TAMANO_EXCEDIDO');

    const imagen = await imagenSintetica();
    const sinTexto = await request(app.getHttpServer())
      .post(`/libros/${crear.body.id}/portada`)
      .set('Authorization', `Bearer ${token}`)
      .attach('portada', imagen, { filename: 'portada.jpg', contentType: 'image/jpeg' });
    expect(sinTexto.status).toBe(400);
    expect(sinTexto.body.code).toBe('LIBRO_TEXTO_ALTERNATIVO_REQUERIDO');

    // H-94/H-94a: una imagen con el lado corto por debajo del mínimo
    // (800px) se rechaza en vez de agrandarse en silencio.
    const imagenChica = await imagenSintetica(200, 300);
    const dimensionInsuficiente = await request(app.getHttpServer())
      .post(`/libros/${crear.body.id}/portada`)
      .set('Authorization', `Bearer ${token}`)
      .field('portadaDescripcion', 'Texto')
      .attach('portada', imagenChica, { filename: 'chica.jpg', contentType: 'image/jpeg' });
    expect(dimensionInsuficiente.status).toBe(400);
    expect(dimensionInsuficiente.body.code).toBe('PORTADA_DIMENSION_INSUFICIENTE');
  });

  /**
   * H-89: PATCH /libros/reordenar. El conjunto de Libros activos de esta
   * base de test acumula fixtures de tests anteriores en este mismo
   * archivo (sin limpiar entre tests, solo en `afterAll`) — en vez de
   * asumir cuáles son, se lee el conjunto real primero (`activosAntes`) y
   * se arma el pedido a partir de eso, así el test no depende del orden en
   * que corren los demás.
   */
  it('persiste el orden nuevo completo, y rechaza un conjunto que no coincide (H-89)', async () => {
    const token = await mintToken(['admin']);

    const activosAntes = await request(app.getHttpServer()).get('/libros?estado=activas&take=200');
    const idsPrevios: string[] = activosAntes.body.items.map((libro: { id: string }) => libro.id);

    const nuevos: string[] = [];
    for (let i = 0; i < 3; i++) {
      const crear = await request(app.getHttpServer())
        .post('/libros')
        .set('Authorization', `Bearer ${token}`)
        .send({ titulo: `Integ reordenar ${i} ${Date.now()}`, autor: 'Autor', anio: 2020 });
      idsCreados.push(crear.body.id);
      nuevos.push(crear.body.id);
    }

    // Los tres nuevos primero, en orden inverso al de creación — para que
    // el resultado no pueda confundirse con "quedó como estaba".
    const ordenPedido = [...nuevos].reverse().concat(idsPrevios);

    const reordenado = await request(app.getHttpServer())
      .patch('/libros/reordenar')
      .set('Authorization', `Bearer ${token}`)
      .send({ ids: ordenPedido });
    expect(reordenado.status).toBe(200);

    const despues = await request(app.getHttpServer()).get('/libros?estado=activas&take=200');
    const idsDespues: string[] = despues.body.items.map((libro: { id: string }) => libro.id);
    expect(idsDespues).toEqual(ordenPedido);

    // Sin faltantes: le saco uno.
    const sinUno = await request(app.getHttpServer())
      .patch('/libros/reordenar')
      .set('Authorization', `Bearer ${token}`)
      .send({ ids: ordenPedido.slice(1) });
    expect(sinUno.status).toBe(400);
    expect(sinUno.body.code).toBe('LIBRO_ORDEN_CONJUNTO_INVALIDO');

    // Sin ajenos: le sumo un id que no está en el conjunto activo.
    const conAjeno = await request(app.getHttpServer())
      .patch('/libros/reordenar')
      .set('Authorization', `Bearer ${token}`)
      .send({ ids: [...ordenPedido, '11111111-1111-4111-8111-111111111111'] });
    expect(conAjeno.status).toBe(400);
    expect(conAjeno.body.code).toBe('LIBRO_ORDEN_CONJUNTO_INVALIDO');

    // Sin repetidos: mismo tamaño, pero un id dos veces en vez de otro —
    // rechazado por el DTO (ArrayUnique), antes de llegar al service.
    const conRepetido = await request(app.getHttpServer())
      .patch('/libros/reordenar')
      .set('Authorization', `Bearer ${token}`)
      .send({ ids: [ordenPedido[0], ordenPedido[0], ...ordenPedido.slice(2)] });
    expect(conRepetido.status).toBe(400);
  });
});
