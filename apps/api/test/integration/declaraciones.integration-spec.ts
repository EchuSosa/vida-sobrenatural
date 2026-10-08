import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import { SignJWT } from 'jose';
import type { PrismaService } from '../../src/prisma/prisma.service.js';
import { NotificacionesService } from '../../src/notificaciones/notificaciones.service.js';
import { Escenario, MARTES_19_A_21, levantarApp, tokenDe } from './discipulado-fixtures.js';
import { limpiarCamino, nacidoHace, registrarAvisos } from './camino-fixtures.js';

/**
 * spec 006, T035 (FR-008 a FR-011, FR-018; Historia 2, escenarios 1, 4 y 5):
 * "Ya lo hice" de la Persona contra la base — declarar, cada rechazo con su
 * código en el orden del contrato, el índice parcial ante una carrera, y
 * retirar. El aviso `historial.declaracion_creada` sale una sola vez y solo si
 * la declaración se creó.
 */
describe('Declaraciones de historial de la Persona (spec 006, T035)', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;
  let esc: Escenario;
  let adminId: string;
  let discId: string;
  let avisos: ReturnType<typeof registrarAvisos>;
  const sufijo = `decl-${Date.now()}`;

  async function declarar(personaId: string, cuerpo: Record<string, unknown>, esperado?: number) {
    const res = await request(app.getHttpServer())
      .post('/camino/me/declaraciones')
      .set('Authorization', `Bearer ${await tokenDe(personaId, ['miembro_registrado'])}`)
      .send(cuerpo);
    if (esperado !== undefined) expect({ status: res.status, body: res.body }).toMatchObject({ status: esperado });
    return res;
  }

  async function retirar(personaId: string, declaracionId: string) {
    return request(app.getHttpServer())
      .delete(`/camino/me/declaraciones/${declaracionId}`)
      .set('Authorization', `Bearer ${await tokenDe(personaId, ['miembro_registrado'])}`);
  }

  beforeAll(async () => {
    ({ app, prisma } = await levantarApp());
    avisos = registrarAvisos(app.get(NotificacionesService));
    esc = new Escenario(prisma, sufijo);
    await esc.preparar();
    adminId = await esc.persona('admin', { rol: ['miembro_registrado', 'admin'] });
    discId = await esc.discipulador('disc', { max: 5 });
  });

  afterAll(async () => {
    avisos.restaurar();
    await limpiarCamino(prisma, `Test${sufijo}`);
    await esc.limpiar();
    await app.close();
  });

  beforeEach(() => {
    avisos.emitidos.length = 0;
  });

  it('declarar: 201 con la declaración pendiente, el comentario guardado sin espacios de más y un solo aviso al Admin', async () => {
    const id = await esc.persona('declara');
    const res = await declarar(id, { etapa: 'bautismo', comentario: '  Me bauticé en 2015 en otra iglesia  ' }, 201);
    expect(res.body).toEqual({ id: expect.any(String), etapa: 'bautismo', estado: 'pendiente', createdAt: expect.any(String) });
    const guardada = await prisma.declaracionHistorial.findUniqueOrThrow({ where: { id: res.body.id } });
    expect(guardada).toMatchObject({ personaId: id, estado: 'pendiente', comentario: 'Me bauticé en 2015 en otra iglesia', creadoPorId: null });
    expect(avisos.emitidos).toEqual([
      { nombre: 'historial.declaracion_creada', a: { tipo: 'admin' }, datos: { declaracionId: res.body.id, etapa: 'bautismo' } },
    ]);
  });

  it('una segunda pendiente de la misma etapa → 409 DECLARACION_YA_PENDIENTE, sin aviso; otra etapa sí', async () => {
    const id = await esc.persona('dos');
    await declarar(id, { etapa: 'ministerio' }, 201);
    avisos.emitidos.length = 0;
    const res = await declarar(id, { etapa: 'ministerio' }, 409);
    expect(res.body.code).toBe('DECLARACION_YA_PENDIENTE');
    expect(avisos.emitidos).toEqual([]);
    await declarar(id, { etapa: 'vida_de_servicio' }, 201);
  });

  it('dos "Ya lo hice" simultáneos de la misma etapa: el índice parcial deja uno solo', async () => {
    const id = await esc.persona('carrera');
    const respuestas = await Promise.all([declarar(id, { etapa: 'bautismo' }), declarar(id, { etapa: 'bautismo' })]);
    expect(respuestas.map((r) => r.status).sort((a, b) => a - b)).toEqual([201, 409]);
    expect(respuestas.find((r) => r.status === 409)!.body.code).toBe('DECLARACION_YA_PENDIENTE');
    expect(await prisma.declaracionHistorial.count({ where: { personaId: id, estado: 'pendiente' } })).toBe(1);
  });

  it('Vida Nueva con pedido abierto o con Grupo en curso → 409 ETAPA_EN_CURSO', async () => {
    const conPedido = await esc.persona('conpedido');
    await prisma.solicitudDiscipulado.create({ data: { personaId: conPedido, franjas: { create: [MARTES_19_A_21] } } });
    expect((await declarar(conPedido, { etapa: 'vida_nueva' }, 409)).body.code).toBe('ETAPA_EN_CURSO');

    const enGrupo = await esc.persona('engrupo');
    await esc.grupo(discId, [enGrupo], adminId);
    expect((await declarar(enGrupo, { etapa: 'vida_nueva' }, 409)).body.code).toBe('ETAPA_EN_CURSO');
    // Las otras etapas no dependen de Vida Nueva (FR-008: bloqueadas también se cuentan).
    await declarar(enGrupo, { etapa: 'bautismo' }, 201);
    expect(avisos.emitidos).toHaveLength(1);
  });

  it('etapa completa (por el sistema o con Completitud vigente) → 409 ETAPA_YA_COMPLETADA', async () => {
    const porSistema = await esc.persona('porsistema');
    const { inscripciones: [insc] } = await esc.grupo(discId, [porSistema], adminId);
    await prisma.inscripcion.update({ where: { id: insc }, data: { estado: 'completada', cerradaEn: new Date() } });
    expect((await declarar(porSistema, { etapa: 'vida_nueva' }, 409)).body.code).toBe('ETAPA_YA_COMPLETADA');

    const porHistorial = await esc.persona('porhistorial');
    await prisma.completitudManual.create({ data: { personaId: porHistorial, etapa: 'bautismo', origen: 'admin', registradaPorId: adminId } });
    expect((await declarar(porHistorial, { etapa: 'bautismo' }, 409)).body.code).toBe('ETAPA_YA_COMPLETADA');
  });

  it('menor de 12 → 409 EDAD_INSUFICIENTE_PARA_PEDIR_SOLO (antes que cualquier otra regla)', async () => {
    const id = await esc.persona('menor', { fechaNacimiento: nacidoHace(11) });
    await prisma.completitudManual.create({ data: { personaId: id, etapa: 'bautismo', origen: 'admin', registradaPorId: adminId } });
    expect((await declarar(id, { etapa: 'bautismo' }, 409)).body.code).toBe('EDAD_INSUFICIENTE_PARA_PEDIR_SOLO');
    const doce = await esc.persona('doce', { fechaNacimiento: nacidoHace(12) });
    await declarar(doce, { etapa: 'bautismo' }, 201);
  });

  it('comentario de 501 o etapa que no existe → 400 VALIDACION con el campo', async () => {
    const id = await esc.persona('validacion');
    const largo = await declarar(id, { etapa: 'bautismo', comentario: 'a'.repeat(501) }, 400);
    expect(largo.body).toMatchObject({ code: 'VALIDACION', errors: [{ campo: 'comentario', code: 'COMENTARIO_DEMASIADO_LARGO' }] });
    const etapa = await declarar(id, { etapa: 'confirmacion' }, 400);
    expect(etapa.body).toMatchObject({ code: 'VALIDACION', errors: [{ campo: 'etapa' }] });
    await declarar(id, { etapa: 'bautismo', comentario: 'é'.repeat(500) }, 201);
  });

  it('retirar: la propia pendiente (204) y se puede volver a contar; ajena o inexistente 404; ya retirada 409', async () => {
    const id = await esc.persona('retira');
    const otra = await esc.persona('ajena');
    const { body } = await declarar(id, { etapa: 'vida_nueva' }, 201);

    expect((await retirar(otra, body.id)).status).toBe(404);
    expect((await retirar(id, '00000000-0000-0000-0000-000000000000')).status).toBe(404);
    expect((await retirar(id, body.id)).status).toBe(204);
    const retirada = await prisma.declaracionHistorial.findUniqueOrThrow({ where: { id: body.id } });
    expect(retirada.estado).toBe('retirada');
    expect(retirada.retiradaEn).not.toBeNull();

    const otraVez = await retirar(id, body.id);
    expect(otraVez.status).toBe(409);
    expect(otraVez.body.code).toBe('DECLARACION_NO_PENDIENTE');
    await declarar(id, { etapa: 'vida_nueva' }, 201);
  });

  it('una declaración ya resuelta por el Admin no se retira (409)', async () => {
    const id = await esc.persona('resuelta');
    const rechazada = await prisma.declaracionHistorial.create({
      data: { personaId: id, etapa: 'ministerio', estado: 'rechazada', revisadoPorId: adminId, revisadaEn: new Date() },
    });
    const res = await retirar(id, rechazada.id);
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('DECLARACION_NO_PENDIENTE');
  });

  it('sin sesión 401; con una cuenta que no está activa 403', async () => {
    await request(app.getHttpServer()).post('/camino/me/declaraciones').send({ etapa: 'bautismo' }).expect(401);
    const id = await esc.persona('pendientetutor');
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
    const token = await new SignJWT({ email: 'x@example.com', personaId: id, estado: 'pendiente_tutor', rol: [] })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(secret);
    await request(app.getHttpServer()).get('/camino/me').set('Authorization', `Bearer ${token}`).expect(403);
  });
});
