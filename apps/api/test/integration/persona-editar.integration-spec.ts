import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import type { PerfilPersona } from '@vida-sobrenatural/shared-types';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import { Escenario, levantarApp, tokenDe } from './discipulado-fixtures.js';

/** spec 013, T081 (Historia 7): `PATCH /personas/:id` contra la base real. */
describe('Editar los datos de una Persona (integración, spec 013 T081)', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;
  let escenario: Escenario;
  let admin: string;
  let pastor: string;
  const id: Record<string, string> = {};
  const anio = new Date().getUTCFullYear();

  const patch = (persona: string, cuerpo: object, token = admin) =>
    request(app.getHttpServer()).patch(`/personas/${persona}`).set('Authorization', `Bearer ${token}`).send(cuerpo);

  beforeAll(async () => {
    ({ app, prisma } = await levantarApp());
    escenario = new Escenario(prisma, `editar${Date.now()}`);
    await escenario.preparar();
    id.admin = await escenario.persona('admin', { rol: ['miembro_registrado', 'admin'] });
    admin = await tokenDe(id.admin, ['miembro_registrado', 'admin']);
    pastor = await tokenDe(await escenario.persona('pastor', { rol: ['miembro_registrado', 'pastor'] }), ['miembro_registrado', 'pastor']);
    id.rosa = await escenario.persona('rosa');
    id.otra = await escenario.persona('otra');
    id.disc = await escenario.persona('disc', { rol: ['miembro_registrado', 'discipulador'] });
  });

  afterAll(async () => {
    await escenario.limpiar();
    await app.close();
  });

  it('H7.1: una edición válida guarda solo lo enviado y devuelve el perfil actualizado (email normalizado)', async () => {
    const r = await patch(id.rosa, { direccion: '  Calle 7 N°123  ', congregaDesde: anio - 2, email: '  Rosa.Nueva@Example.COM ', profesion: 'otro', profesionDetalle: 'Costurera' });
    expect(r.status).toBe(200);
    expect(r.body as PerfilPersona).toMatchObject({ id: id.rosa, direccion: 'Calle 7 N°123', congregaDesde: anio - 2, email: 'rosa.nueva@example.com', profesion: 'otro', profesionDetalle: 'Costurera', nombre: 'rosa' });
    const cambio = await patch(id.rosa, { profesion: 'educacion' });
    expect(cambio.body).toMatchObject({ profesion: 'educacion', profesionDetalle: null });
  });

  it('errores por campo, todos juntos, solo de lo enviado', async () => {
    const r = await patch(id.rosa, { nombre: '', telefono: 'abc', fechaNacimiento: 'no-es-fecha', email: 'sin-arroba' });
    expect(r.status).toBe(400);
    expect(r.body.errors).toEqual(
      expect.arrayContaining([
        { campo: 'nombre', code: 'NOMBRE_INVALIDO' },
        { campo: 'telefono', code: 'TELEFONO_INVALIDO' },
        { campo: 'fechaNacimiento', code: 'FECHANACIMIENTO_INVALIDO' },
        { campo: 'email', code: 'EMAIL_INVALIDO' },
      ]),
    );
    expect(r.body.errors).toHaveLength(4);
    expect((await patch(id.rosa, { profesion: 'otro' })).body.errors).toEqual([{ campo: 'profesionDetalle', code: 'PROFESIONDETALLE_INVALIDO' }]);
  });

  it('H7.2 (D133): una fecha que vuelve menor a un Discipulador → 409 con el código de siempre', async () => {
    const r = await patch(id.disc, { fechaNacimiento: `${anio - 15}-01-01` });
    expect(r.status).toBe(409);
    expect(r.body).toMatchObject({ code: 'PERSONA_MENOR_DE_EDAD_NO_PUEDE_TENER_ROL_DE_CARGO', errors: [{ campo: 'fechaNacimiento' }] });
    const persona = await prisma.persona.findUniqueOrThrow({ where: { id: id.disc }, select: { fechaNacimiento: true } });
    expect(persona.fechaNacimiento.toISOString().slice(0, 10)).toBe('1990-05-20');
  });

  it('H7.3: el email de otra Persona → 409 EMAIL_DUPLICADO en el campo; vacío la deja sin acceso a la app (D145)', async () => {
    const deOtra = (await prisma.persona.findUniqueOrThrow({ where: { id: id.otra }, select: { email: true } })).email!;
    const r = await patch(id.rosa, { email: deOtra.toUpperCase() });
    expect(r.status).toBe(409);
    expect(r.body).toMatchObject({ code: 'EMAIL_DUPLICADO', errors: [{ campo: 'email', code: 'EMAIL_DUPLICADO' }] });
    const sinEmail = await patch(id.rosa, { email: '' });
    expect(sinEmail.body).toMatchObject({ email: null, usaLaApp: false });
  });

  it('H7.5: el Pastor no edita; un id que no existe es 404', async () => {
    const r = await patch(id.rosa, { direccion: 'x' }, pastor);
    expect(r.status).toBe(403);
    expect((await patch('00000000-0000-4000-8000-000000000000', { direccion: 'x' })).status).toBe(404);
  });
});
