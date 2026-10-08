import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Server } from 'node:http';
import request from 'supertest';
import { SignJWT } from 'jose';
import { AppModule } from '../../src/app.module.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import { configurarApp } from '../../src/configurar-app.js';
import { EmailService } from '../../src/email/email.service.js';
import { EmailServiceFalso } from '../email-service-falso.js';

/**
 * spec 007, T018 + T032 (contracts/codigo-ingreso-api.md; FR-003 a FR-011,
 * FR-019, FR-021): pedir y verificar el código contra la base de test, con
 * `EmailServiceFalso` (nunca un mail real).
 */
describe('Código de ingreso por email (spec 007, integración)', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;
  const email = new EmailServiceFalso();
  const sufijo = `codigo-${Date.now()}`;
  const SECRETO = () => process.env.INTERNAL_API_SECRET ?? '';
  let sedeId: string;
  let contadorOrigen = 0;
  const personas: string[] = [];

  const correo = (clave: string) => `integ-${clave}-${sufijo}@example.com`;
  /** Un origen distinto por prueba, para que el límite por IP no cruce casos. */
  const origen = () => `10.7.0.${++contadorOrigen}`;

  function pedir(cuerpo: object, ip = origen(), secreto = SECRETO()) {
    return request(app.getHttpServer())
      .post('/auth/codigo-ingreso/pedidos')
      .set('X-Internal-Secret', secreto)
      .set('X-Origen-Cliente', ip)
      .send(cuerpo);
  }

  function verificar(cuerpo: object) {
    return request(app.getHttpServer()).post('/auth/codigo-ingreso/verificaciones').set('X-Internal-Secret', SECRETO()).send(cuerpo);
  }

  function ultimoCodigo(para: string): string {
    const mensaje = [...email.enviados].reverse().find((m) => m.para === para);
    return /(\d{6})/.exec(mensaje!.asunto)![1];
  }

  async function crearPersona(mail: string): Promise<string> {
    const p = await prisma.persona.create({
      data: {
        email: mail,
        nombre: 'Ana',
        apellido: `Codigo${sufijo}`,
        genero: 'femenino',
        fechaNacimiento: new Date('1960-03-12'),
        telefono: '+5492215550101',
        direccion: 'Calle 7',
        sedeId,
        estadoCivil: 'casado_a',
        profesion: 'otro',
        congregaDesde: 2010,
        estado: 'activa',
        consentimientoDatos: true,
        rol: ['miembro_registrado'],
      },
      select: { id: true },
    });
    personas.push(p.id);
    return p.id;
  }

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(EmailService)
      .useValue(email)
      .compile();
    app = moduleFixture.createNestApplication<INestApplication<Server>>();
    configurarApp(app);
    await app.init();
    prisma = moduleFixture.get(PrismaService);
    const sede = await prisma.sede.create({
      data: { nombre: `Sede código ${sufijo}`, direccion: 'Dirección', horarios: 'Horario', activo: true },
    });
    sedeId = sede.id;
  });

  afterAll(async () => {
    await prisma.codigoIngreso.deleteMany({ where: { email: { endsWith: `${sufijo}@example.com` } } });
    await prisma.persona.deleteMany({ where: { OR: [{ id: { in: personas } }, { email: { endsWith: `${sufijo}@example.com` } }] } });
    await prisma.sede.delete({ where: { id: sedeId } });
    await app.close();
  });

  it('401 sin X-Internal-Secret o con uno equivocado', async () => {
    expect((await pedir({ email: correo('a') }, origen(), '')).status).toBe(401);
    expect((await pedir({ email: correo('a') }, origen(), 'otro')).status).toBe(401);
    const res = await request(app.getHttpServer()).post('/auth/codigo-ingreso/verificaciones').send({ email: correo('a'), codigo: '123456' });
    expect(res.status).toBe(401);
    expect(email.enviados).toHaveLength(0);
  });

  it('400 sin X-Origen-Cliente o con un email inválido (error por campo)', async () => {
    const sinOrigen = await request(app.getHttpServer())
      .post('/auth/codigo-ingreso/pedidos')
      .set('X-Internal-Secret', SECRETO())
      .send({ email: correo('b') });
    expect(sinOrigen.status).toBe(400);
    const res = await pedir({ email: 'ana@' });
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ code: 'VALIDACION', errors: [{ campo: 'email', code: 'EMAIL_INVALIDO' }] });
  });

  it('202 idéntico (cuerpo y headers) para un email registrado y uno que no lo está (FR-008)', async () => {
    const registrado = correo('registrada');
    await crearPersona(registrado);
    const a = await pedir({ email: registrado });
    const b = await pedir({ email: correo('nadie') });
    expect(a.status).toBe(202);
    expect(b.status).toBe(202);
    expect(a.text).toBe('');
    expect(b.text).toBe('');
    const variables = new Set(['date', 'etag', 'x-request-id']);
    const headers = (r: request.Response) => Object.fromEntries(Object.entries(r.headers).filter(([k]) => !variables.has(k)));
    expect(headers(a)).toEqual(headers(b));
    // El mail es idéntico salvo el código (FR-018).
    const [ma, mb] = [registrado, correo('nadie')].map((m) => email.enviados.find((e) => e.para === m)!);
    const sinCodigo = (s: string) => s.replace(/\d{6}/g, 'XXXXXX');
    expect(sinCodigo(ma.html)).toBe(sinCodigo(mb.html));
    expect(sinCodigo(ma.texto)).toBe(sinCodigo(mb.texto));
  });

  it('la tabla nunca guarda el código, la IP ni otro email que el normalizado', async () => {
    const mail = correo('MAYUS').toUpperCase();
    await pedir({ email: `  ${mail} ` }, '203.0.113.77');
    const normalizado = mail.toLowerCase();
    const codigo = ultimoCodigo(normalizado);
    const filas = await prisma.codigoIngreso.findMany({ where: { email: normalizado } });
    expect(filas).toHaveLength(1);
    const crudo = JSON.stringify(filas);
    expect(crudo).not.toContain(codigo);
    expect(crudo).not.toContain('203.0.113.77');
  });

  it('verificación correcta una sola vez, con el código escrito con espacios', async () => {
    const mail = correo('una-vez');
    await pedir({ email: mail });
    const codigo = ultimoCodigo(mail);
    const ok = await verificar({ email: mail.toUpperCase(), codigo: `${codigo.slice(0, 3)} ${codigo.slice(3)}` });
    expect(ok.status).toBe(200);
    expect(ok.body).toEqual({ email: mail });
    const otra = await verificar({ email: mail, codigo });
    expect(otra.status).toBe(422);
    expect(otra.body).toMatchObject({ code: 'CODIGO_VENCIDO', errors: [{ campo: 'codigo', code: 'CODIGO_VENCIDO' }] });
  });

  it('código incorrecto: 422 con intentos restantes; al quinto, sin intentos', async () => {
    const mail = correo('intentos');
    await pedir({ email: mail });
    const codigo = ultimoCodigo(mail);
    const equivocado = codigo === '000000' ? '111111' : '000000';
    const primero = await verificar({ email: mail, codigo: equivocado });
    expect(primero.status).toBe(422);
    expect(primero.body).toMatchObject({ code: 'CODIGO_INCORRECTO', intentosRestantes: 4, errors: [{ campo: 'codigo', code: 'CODIGO_INCORRECTO' }] });
    for (let i = 0; i < 3; i++) await verificar({ email: mail, codigo: equivocado });
    const quinto = await verificar({ email: mail, codigo: equivocado });
    expect(quinto.body).toMatchObject({ code: 'CODIGO_SIN_INTENTOS' });
    expect((await verificar({ email: mail, codigo })).body).toMatchObject({ code: 'CODIGO_VENCIDO' });
  });

  it('429 al sexto pedido de la hora para el mismo email, con reintentarEn', async () => {
    const mail = correo('limite');
    for (let i = 0; i < 5; i++) expect((await pedir({ email: mail })).status).toBe(202);
    const sexto = await pedir({ email: mail });
    expect(sexto.status).toBe(429);
    expect(sexto.body).toMatchObject({ code: 'DEMASIADOS_PEDIDOS', errors: [{ campo: 'email', code: 'DEMASIADOS_PEDIDOS' }] });
    expect(sexto.body.reintentarEn).toBeGreaterThan(0);
    expect(sexto.body.reintentarEn).toBeLessThanOrEqual(3600);
  });

  it('503 si el envío falla, y ese pedido no cuenta', async () => {
    const mail = correo('falla');
    email.fallarLosProximos(1);
    const res = await pedir({ email: mail });
    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ code: 'ENVIO_EMAIL_FALLIDO' });
    expect(await prisma.codigoIngreso.count({ where: { email: mail } })).toBe(0);
  });

  it('GET /personas/by-email encuentra con mayúsculas y espacios (FR-010)', async () => {
    const mail = correo('busqueda');
    const id = await crearPersona(mail);
    const res = await request(app.getHttpServer())
      .get('/personas/by-email')
      .query({ email: `  ${mail.toUpperCase()} ` })
      .set('X-Internal-Secret', SECRETO());
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(id);
  });

  it('POST /personas con un email existente en otra capitalización → EMAIL_DUPLICADO (T032, FR-011)', async () => {
    const mail = correo('duplicada');
    await crearPersona(mail);
    const token = await new SignJWT({ email: mail.toUpperCase(), personaId: null, estado: null, rol: [] })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(new TextEncoder().encode(process.env.NEXTAUTH_SECRET));
    const res = await request(app.getHttpServer())
      .post('/personas')
      .set('Authorization', `Bearer ${token}`)
      .send({
        apellido: 'Otra',
        nombre: 'Ana',
        genero: 'femenino',
        fechaNacimiento: '1990-05-20',
        telefono: '+5492211239876',
        direccion: 'Calle 1 y 50',
        sedeId,
        estadoCivil: 'soltero_a',
        profesion: 'arte_diseno',
        congregaDesde: 2020,
        consentimientoDatos: true,
      });
    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({ code: 'EMAIL_DUPLICADO' });
  });
});
