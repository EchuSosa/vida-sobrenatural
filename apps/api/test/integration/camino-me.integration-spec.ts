import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import { ETAPAS_CAMINO, type CaminoDeLaPersona } from '@vida-sobrenatural/shared-types';
import type { PrismaService } from '../../src/prisma/prisma.service.js';
import { Escenario, MARTES_19_A_21, levantarApp, tokenDe } from './discipulado-fixtures.js';
import { limpiarCamino, nacidoHace } from './camino-fixtures.js';

/**
 * spec 006, T025 (FR-001, FR-005, FR-007, SC-002): `GET /camino/me` contra la
 * base — las cuatro etapas en orden para cada situación de Vida Nueva de la
 * 004 y del historial, `vidaNueva` igual a `GET /discipulado/me`, y que una
 * Persona no ve lo de otra.
 */
describe('GET /camino/me (spec 006, T025)', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;
  let esc: Escenario;
  let adminId: string;
  let discId: string;
  const sufijo = `cme-${Date.now()}`;

  async function camino(personaId: string): Promise<CaminoDeLaPersona> {
    const res = await request(app.getHttpServer())
      .get('/camino/me')
      .set('Authorization', `Bearer ${await tokenDe(personaId, ['miembro_registrado'])}`)
      .expect(200);
    return res.body as CaminoDeLaPersona;
  }

  function etapa(c: CaminoDeLaPersona, nombre: string) {
    return c.etapas.find((e) => e.etapa === nombre)!;
  }

  beforeAll(async () => {
    ({ app, prisma } = await levantarApp());
    esc = new Escenario(prisma, sufijo);
    await esc.preparar();
    adminId = await esc.persona('admin', { rol: ['miembro_registrado', 'admin'] });
    discId = await esc.discipulador('disc', { max: 5 });
  });

  afterAll(async () => {
    await limpiarCamino(prisma, `Test${sufijo}`);
    await esc.limpiar();
    await app.close();
  });

  it('sin sesión → 401', async () => {
    await request(app.getHttpServer()).get('/camino/me').expect(401);
  });

  it('Persona sin nada: cuatro etapas en orden, Vida Nueva disponible, las demás según ETAPAS_CONSTRUIDAS, y la Sede para el contacto', async () => {
    const id = await esc.persona('nada');
    await prisma.sede.update({ where: { id: esc.sedeId }, data: { contactoTelefono: '+54 221 555-0000' } });
    const c = await camino(id);
    expect(c.etapas.map((e) => e.etapa)).toEqual(ETAPAS_CAMINO);
    expect(etapa(c, 'vida_nueva')).toEqual({ etapa: 'vida_nueva', estado: 'disponible', puedeDeclarar: true });
    for (const otra of c.etapas.filter((e) => e.etapa !== 'vida_nueva')) {
      expect(['proximamente', 'bloqueada']).toContain(otra.estado);
      expect(otra).toMatchObject({ puedeDeclarar: true });
    }
    expect(c.vidaNueva).toEqual({ estado: 'puede_pedir' });
    expect(c.sede).toEqual({ nombre: expect.stringContaining('Sede discipulado integ'), telefono: '+54 221 555-0000' });

    // `vidaNueva` es exactamente lo de GET /discipulado/me (FR-005).
    const vn = await request(app.getHttpServer())
      .get('/discipulado/me')
      .set('Authorization', `Bearer ${await tokenDe(id, ['miembro_registrado'])}`)
      .expect(200);
    expect(c.vidaNueva).toEqual(vn.body);

    await prisma.sede.update({ where: { id: esc.sedeId }, data: { contactoTelefono: null } });
    expect((await camino(id)).sede?.telefono).toBeNull();
  });

  it('con pedido abierto (buscando) → Vida Nueva en curso, sin "Ya lo hice"', async () => {
    const id = await esc.persona('buscando');
    await prisma.solicitudDiscipulado.create({ data: { personaId: id, franjas: { create: [MARTES_19_A_21] } } });
    const c = await camino(id);
    expect(etapa(c, 'vida_nueva')).toEqual({ etapa: 'vida_nueva', estado: 'en_curso' });
    expect(c.vidaNueva.estado).toBe('buscando');
  });

  it('con Grupo en curso → en curso; finalizado → completada por el sistema; con baja → disponible otra vez', async () => {
    const enCurso = await esc.persona('encurso');
    await esc.grupo(discId, [enCurso], adminId);
    expect(etapa(await camino(enCurso), 'vida_nueva')).toEqual({ etapa: 'vida_nueva', estado: 'en_curso' });

    const finalizada = await esc.persona('finalizada');
    const { inscripciones: [insc] } = await esc.grupo(discId, [finalizada], adminId);
    await prisma.inscripcion.update({ where: { id: insc }, data: { estado: 'completada', cerradaEn: new Date() } });
    const cf = await camino(finalizada);
    expect(etapa(cf, 'vida_nueva')).toEqual({ etapa: 'vida_nueva', estado: 'completada', como: 'sistema' });
    expect(cf.vidaNueva.estado).toBe('finalizado');

    const baja = await esc.persona('baja');
    const { inscripciones: [inscBaja] } = await esc.grupo(discId, [baja], adminId);
    await prisma.inscripcion.update({ where: { id: inscBaja }, data: { estado: 'dada_de_baja', cerradaEn: new Date() } });
    const cb = await camino(baja);
    expect(etapa(cb, 'vida_nueva')).toEqual({ etapa: 'vida_nueva', estado: 'disponible', puedeDeclarar: true });
    expect(cb.vidaNueva.estado).toBe('baja');
  });

  it('menor de 12 → Vida Nueva disponible sin "Ya lo hice" (lo pide su tutor) y ninguna etapa declarable', async () => {
    const id = await esc.persona('menor', { fechaNacimiento: nacidoHace(10) });
    const c = await camino(id);
    expect(c.vidaNueva).toEqual({ estado: 'lo_pide_su_tutor' });
    for (const e of c.etapas) expect(e).toMatchObject({ puedeDeclarar: false });
  });

  it('historial: pendiente → en revisión; rechazada → no confirmada con motivo; rechazada y después retirada → sin mensaje', async () => {
    const id = await esc.persona('historial');
    const pendiente = await prisma.declaracionHistorial.create({ data: { personaId: id, etapa: 'bautismo', comentario: 'En 2015' } });
    await prisma.declaracionHistorial.create({
      data: { personaId: id, etapa: 'vida_de_servicio', estado: 'rechazada', revisadoPorId: adminId, revisadaEn: new Date('2026-10-01T13:00:00Z'), motivoRechazo: 'Traenos el certificado y lo vemos' },
    });
    const c = await camino(id);
    expect(etapa(c, 'bautismo')).toEqual({ etapa: 'bautismo', estado: 'en_revision', declaracionId: pendiente.id, desde: pendiente.createdAt.toISOString() });
    expect(etapa(c, 'vida_de_servicio')).toMatchObject({
      puedeDeclarar: true,
      declaracion: { estado: 'no_confirmada', motivo: 'Traenos el certificado y lo vemos', en: '2026-10-01T13:00:00.000Z' },
    });

    // La vuelve a contar y la retira: la última ya no es la rechazada.
    await prisma.declaracionHistorial.create({ data: { personaId: id, etapa: 'vida_de_servicio', estado: 'retirada', retiradaEn: new Date() } });
    expect(etapa(await camino(id), 'vida_de_servicio')).not.toHaveProperty('declaracion');
  });

  it('confirmada → completada por historial; con la Completitud anulada deja de contar', async () => {
    const id = await esc.persona('confirmada');
    const declaracion = await prisma.declaracionHistorial.create({
      data: { personaId: id, etapa: 'vida_nueva', estado: 'confirmada', revisadoPorId: adminId, revisadaEn: new Date() },
    });
    const completitud = await prisma.completitudManual.create({
      data: { personaId: id, etapa: 'vida_nueva', origen: 'declaracion', declaracionId: declaracion.id, registradaPorId: adminId },
    });
    expect(etapa(await camino(id), 'vida_nueva')).toEqual({ etapa: 'vida_nueva', estado: 'completada', como: 'historial' });

    await prisma.completitudManual.update({ where: { id: completitud.id }, data: { anuladaEn: new Date(), anuladaPorId: adminId } });
    expect(etapa(await camino(id), 'vida_nueva')).toEqual({ etapa: 'vida_nueva', estado: 'disponible', puedeDeclarar: true });
  });

  it('una Persona no ve las declaraciones de otra (D134)', async () => {
    const una = await esc.persona('una');
    const otra = await esc.persona('otra');
    await prisma.declaracionHistorial.create({ data: { personaId: una, etapa: 'ministerio' } });
    const c = await camino(otra);
    expect(etapa(c, 'ministerio').estado).not.toBe('en_revision');
    expect(JSON.stringify(c)).not.toContain(una);
  });
});
