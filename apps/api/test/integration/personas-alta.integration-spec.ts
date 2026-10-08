import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import type { PrismaService } from '../../src/prisma/prisma.service.js';
import { Escenario, levantarApp, tokenDe } from './discipulado-fixtures.js';

/**
 * spec 006, T068 + T073 (Historia 4 escenario 4; Historia 5 escenarios 1 y
 * 3–9; FR-030 a FR-037; SC-007): el alta de adultos por el Admin contra la
 * base — con y sin email, todos los errores de campo juntos, el aviso de
 * posible duplicado (teléfono escrito de tres formas, homónimos), el reintento
 * confirmado, la carrera por el mismo email, los permisos y "Agregar email".
 */
describe('Alta de adultos por el Admin (spec 006, T068/T073)', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;
  let esc: Escenario;
  let adminId: string;
  const sufijo = `alta-${Date.now()}`;
  const ADMIN = ['miembro_registrado', 'admin'];
  let base: Record<string, unknown>;
  let contador = 0;

  /** Datos válidos, con un teléfono y una fecha propios por caso para que no choquen entre sí. */
  function datos(cambios: Record<string, unknown> = {}) {
    contador += 1;
    return {
      ...base,
      apellido: `Alta${sufijo}`,
      nombre: `Rosa${contador}`,
      telefono: `+54 9 221 ${String(4000000 + contador)}`,
      fechaNacimiento: `19${String(40 + (contador % 50)).padStart(2, '0')}-0${(contador % 9) + 1}-1${contador % 9}`,
      ...cambios,
    };
  }

  async function alta(cuerpo: object, rol = ADMIN, autor = adminId) {
    return request(app.getHttpServer()).post('/personas/alta').set('Authorization', `Bearer ${await tokenDe(autor, rol)}`).send(cuerpo);
  }

  beforeAll(async () => {
    ({ app, prisma } = await levantarApp());
    esc = new Escenario(prisma, sufijo);
    await esc.preparar();
    adminId = await esc.persona('admin', { rol: ADMIN });
    base = {
      genero: 'femenino',
      direccion: 'Calle 7 1234',
      sedeId: esc.sedeId,
      estadoCivil: 'viudo_a',
      profesion: 'jubilado_a',
      congregaDesde: 2012,
      consentimiento: true,
    };
  });

  afterAll(async () => {
    const ids = (await prisma.persona.findMany({ where: { apellido: { startsWith: `Alta${sufijo}` } }, select: { id: true } })).map((p) => p.id);
    await prisma.entregaNotificacion.deleteMany({ where: { personaId: { in: ids } } });
    await prisma.notificacion.deleteMany({ where: { alcanceId: { in: ids } } });
    await prisma.persona.deleteMany({ where: { id: { in: ids } } });
    await esc.limpiar();
    await app.close();
  });

  it('sin email: activa, origen admin, quién la dio de alta, consentimiento presencial y miembro_registrado (escenario 1)', async () => {
    const res = await alta(datos({ email: null }));
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ id: expect.any(String), sinAccesoALaApp: true });
    const p = await prisma.persona.findUniqueOrThrow({ where: { id: res.body.id } });
    expect(p).toMatchObject({
      email: null,
      estado: 'activa',
      activo: true,
      origenAlta: 'admin',
      altaPor: adminId,
      consentimientoDatos: true,
      consentimientoDatosOrigen: 'presencial',
    });
    expect(p.consentimientoDatosFecha).not.toBeNull();
    expect(p.rol).toEqual(['miembro_registrado']);
  });

  it('con email: queda normalizado y con acceso', async () => {
    const res = await alta(datos({ email: `  ROSA.${sufijo}@Ejemplo.COM ` }));
    expect(res.status).toBe(201);
    expect(res.body.sinAccesoALaApp).toBe(false);
    expect((await prisma.persona.findUniqueOrThrow({ where: { id: res.body.id } })).email).toBe(`rosa.${sufijo}@ejemplo.com`);
  });

  it('todo vacío: todos los errores de campo juntos, con el consentimiento (escenario 2)', async () => {
    const res = await alta({});
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDACION');
    const campos = (res.body.errors as Array<{ campo: string }>).map((e) => e.campo).sort();
    expect(campos).toEqual(
      ['apellido', 'congregaDesde', 'consentimiento', 'direccion', 'estadoCivil', 'fechaNacimiento', 'genero', 'nombre', 'profesion', 'sedeId', 'telefono'].sort(),
    );
  });

  it('menor de 18 → ALTA_MENOR_DE_EDAD en el campo, junto con los demás errores (escenario 6)', async () => {
    const hace10 = `${new Date().getFullYear() - 10}-01-01`;
    const res = await alta(datos({ fechaNacimiento: hace10, telefono: 'x', email: 'no-es-email' }));
    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual(
      expect.arrayContaining([
        { campo: 'fechaNacimiento', code: 'ALTA_MENOR_DE_EDAD' },
        { campo: 'telefono', code: 'TELEFONO_INVALIDO' },
        { campo: 'email', code: 'EMAIL_INVALIDO' },
      ]),
    );
  });

  it('email ya usado → 409 EMAIL_DUPLICADO en el campo (escenario 5)', async () => {
    const email = `dup.${sufijo}@ejemplo.com`;
    expect((await alta(datos({ email }))).status).toBe(201);
    const res = await alta(datos({ email: email.toUpperCase() }));
    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({ code: 'EMAIL_DUPLICADO', errors: [{ campo: 'email', code: 'EMAIL_DUPLICADO' }] });
  });

  it('el mismo teléfono escrito de tres formas avisa posible duplicado, y "crear igual" crea (escenarios 3 y 4, SC-007)', async () => {
    const primera = await alta(datos({ telefono: '+54 9 221 555 0101', fechaNacimiento: '1950-05-05' }));
    expect(primera.status).toBe(201);
    for (const telefono of ['+54 221 5550101', '+549221 5550101', '+54 9 2215550101']) {
      const res = await alta(datos({ telefono, fechaNacimiento: '1960-06-06' }));
      expect({ telefono, status: res.status, code: res.body.code }).toEqual({ telefono, status: 409, code: 'POSIBLE_DUPLICADO' });
      expect(res.body.coincidencias).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: primera.body.id, activa: true, porque: ['telefono'] })]),
      );
    }
    const igual = await alta(datos({ telefono: '+54 221 5550101', fechaNacimiento: '1960-06-06', confirmarPosibleDuplicado: true }));
    expect(igual.status).toBe(201);
  });

  it('mismo nombre, apellido y fecha con tildes distintas avisa; homónimo con otra fecha no (research #7)', async () => {
    const jose = await alta(datos({ nombre: 'José', apellido: `Alta${sufijo} Pérez`, fechaNacimiento: '1955-07-07' }));
    expect(jose.status).toBe(201);
    const homonimo = await alta(datos({ nombre: ' jose ', apellido: `ALTA${sufijo} PEREZ`, fechaNacimiento: '1955-07-07' }));
    expect(homonimo.status).toBe(409);
    expect(homonimo.body.coincidencias).toEqual([expect.objectContaining({ id: jose.body.id, porque: ['nombre_apellido_fecha'] })]);
    const otraFecha = await alta(datos({ nombre: 'José', apellido: `Alta${sufijo} Pérez`, fechaNacimiento: '1956-07-07' }));
    expect(otraFecha.status).toBe(201);
  });

  it('avisa también contra una Persona inactiva, marcada como tal', async () => {
    const vieja = await alta(datos({ telefono: '+54 9 221 666 0202', fechaNacimiento: '1945-02-02' }));
    await prisma.persona.update({ where: { id: vieja.body.id }, data: { activo: false } });
    const res = await alta(datos({ telefono: '+54 221 6660202' }));
    expect(res.status).toBe(409);
    expect(res.body.coincidencias).toEqual([expect.objectContaining({ id: vieja.body.id, activa: false })]);
  });

  it('dos altas a la vez con el mismo email → una sola Persona', async () => {
    const email = `carrera.${sufijo}@ejemplo.com`;
    const [a, b] = await Promise.all([alta(datos({ email })), alta(datos({ email }))]);
    expect([a.status, b.status].sort((x, y) => x - y)).toEqual([201, 409]);
    expect(await prisma.persona.count({ where: { email } })).toBe(1);
  });

  it('el Discipulador y el Pastor reciben 403 (Historia 4 escenario 4, escenario 9)', async () => {
    const disc = await esc.persona('disc', { rol: ['miembro_registrado', 'discipulador'] });
    const pastor = await esc.persona('pastor', { rol: ['miembro_registrado', 'pastor'] });
    expect((await alta(datos(), ['miembro_registrado', 'discipulador'], disc)).status).toBe(403);
    expect((await alta(datos(), ['miembro_registrado', 'pastor'], pastor)).status).toBe(403);
    const sinEmail = await alta(datos({ email: null }));
    for (const [id, rol] of [[disc, ['miembro_registrado', 'discipulador']], [pastor, ['miembro_registrado', 'pastor']]] as const) {
      const res = await request(app.getHttpServer())
        .patch(`/personas/${sinEmail.body.id}/email`)
        .set('Authorization', `Bearer ${await tokenDe(id, [...rol])}`)
        .send({ email: 'x@ejemplo.com' });
      expect(res.status).toBe(403);
    }
  });

  it('"Agregar email": a quien no tiene (200), a quien tiene → EMAIL_YA_CARGADO, usado → EMAIL_DUPLICADO, formato → VALIDACION (escenario 8)', async () => {
    const token = await tokenDe(adminId, ADMIN);
    const sin = (await alta(datos({ email: null }))).body.id as string;
    const otra = (await alta(datos({ email: null }))).body.id as string;
    const agregar = (id: string, email: string) => request(app.getHttpServer()).patch(`/personas/${id}/email`).set('Authorization', `Bearer ${token}`).send({ email });

    const formato = await agregar(sin, 'no-es-email');
    expect(formato.body).toMatchObject({ code: 'VALIDACION', errors: [{ campo: 'email', code: 'EMAIL_INVALIDO' }] });
    const ok = await agregar(sin, ` Nueva.${sufijo}@Ejemplo.com`);
    expect(ok.status).toBe(200);
    expect(ok.body).toEqual({ id: sin, email: `nueva.${sufijo}@ejemplo.com`, sinAccesoALaApp: false });
    expect((await agregar(sin, `otra.${sufijo}@ejemplo.com`)).body.code).toBe('EMAIL_YA_CARGADO');
    const usado = await agregar(otra, `nueva.${sufijo}@ejemplo.com`);
    expect(usado.body).toMatchObject({ code: 'EMAIL_DUPLICADO', errors: [{ campo: 'email', code: 'EMAIL_DUPLICADO' }] });

    // El login por email la encuentra igual que a cualquiera (FR-038).
    const login = await request(app.getHttpServer())
      .get(`/personas/by-email?email=${encodeURIComponent(`nueva.${sufijo}@ejemplo.com`)}`)
      .set('x-internal-secret', process.env.INTERNAL_API_SECRET ?? '');
    expect(login.status).toBe(200);
    expect(login.body).toMatchObject({ id: sin });
  });

  describe('DNI opcional (D215)', () => {
    // Ocho dígitos propios de esta corrida, para no chocar con otras.
    const raiz = String(Date.now()).slice(-6);
    const dni = (n: number) => `${n}${raiz}`.padStart(8, '1').slice(-8);

    it('con puntos: se guarda solo con dígitos y no vuelve en la respuesta', async () => {
      const crudo = dni(10);
      const res = await alta(datos({ dni: `${crudo.slice(0, 2)}.${crudo.slice(2, 5)}.${crudo.slice(5)}` }));
      expect(res.status).toBe(201);
      expect(JSON.stringify(res.body)).not.toContain(crudo);
      expect((await prisma.persona.findUniqueOrThrow({ where: { id: res.body.id } })).dni).toBe(crudo);
    });

    it('sin DNI, dos Personas no chocan', async () => {
      expect((await alta(datos({ dni: null }))).status).toBe(201);
      expect((await alta(datos({ dni: '' }))).status).toBe(201);
    });

    it('mal escrito → VALIDACION en el campo, junto con los demás', async () => {
      const res = await alta(datos({ dni: '12.34', direccion: '' }));
      expect(res.status).toBe(400);
      expect(res.body.errors).toEqual(expect.arrayContaining([{ campo: 'dni', code: 'DNI_INVALIDO' }, expect.objectContaining({ campo: 'direccion' })]));
    });

    it('repetido → 409 DNI_DUPLICADO en el campo con quién lo tiene (sin el DNI), aunque se confirme y aunque esté inactiva', async () => {
      const crudo = dni(20);
      const primera = await alta(datos({ dni: crudo, nombre: 'Elsa' }));
      expect(primera.status).toBe(201);
      await prisma.persona.update({ where: { id: primera.body.id }, data: { activo: false } });
      const res = await alta(datos({ dni: `${crudo.slice(0, 2)}.${crudo.slice(2)}`, confirmarPosibleDuplicado: true }));
      expect(res.status).toBe(409);
      expect(res.body).toMatchObject({
        code: 'DNI_DUPLICADO',
        errors: [{ campo: 'dni', code: 'DNI_DUPLICADO' }],
        persona: { id: primera.body.id, nombre: 'Elsa', apellido: `Alta${sufijo}` },
      });
      expect(JSON.stringify(res.body)).not.toContain(crudo);
      expect(await prisma.persona.count({ where: { dni: crudo } })).toBe(1);
    });

    it('dos altas a la vez con el mismo DNI → una sola Persona', async () => {
      const crudo = dni(30);
      const [a, b] = await Promise.all([alta(datos({ dni: crudo })), alta(datos({ dni: crudo }))]);
      expect([a.status, b.status].sort((x, y) => x - y)).toEqual([201, 409]);
      expect([a.body.code, b.body.code]).toContain('DNI_DUPLICADO');
      expect(await prisma.persona.count({ where: { dni: crudo } })).toBe(1);
    });

    it('el listado de Personas no lo muestra', async () => {
      const crudo = dni(40);
      expect((await alta(datos({ dni: crudo }))).status).toBe(201);
      const res = await request(app.getHttpServer())
        .get(`/personas?q=${encodeURIComponent(`Alta${sufijo}`)}`)
        .set('Authorization', `Bearer ${await tokenDe(adminId, ADMIN)}`);
      expect(res.status).toBe(200);
      expect(JSON.stringify(res.body)).not.toContain(crudo);
      expect(JSON.stringify(res.body)).not.toContain('"dni"');
    });
  });
});
