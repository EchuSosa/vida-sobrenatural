import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import type { GruposDePersona, PerfilPersona, SolicitudBandeja } from '@vida-sobrenatural/shared-types';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import { Escenario, levantarApp, tokenDe } from './discipulado-fixtures.js';

const DIA = 86_400_000;

/**
 * spec 013, T032 (Historia 2, contracts/perfil-persona-api.md): el perfil y
 * los Grupos de una Persona contra la base real, y su historial de
 * Solicitudes por la bandeja (`persona=`).
 */
describe('Perfil de Persona (integración, spec 013 T032)', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;
  let escenario: Escenario;
  let admin: string;
  let adminId: string;
  let pastor: string;
  let discipulador: string;
  const id: Record<string, string> = {};

  const get = (ruta: string, token = admin) => request(app.getHttpServer()).get(ruta).set('Authorization', `Bearer ${token}`);
  const anioMenor = new Date().getUTCFullYear() - 10;

  beforeAll(async () => {
    ({ app, prisma } = await levantarApp());
    escenario = new Escenario(prisma, `perfil${Date.now()}`);
    await escenario.preparar();
    adminId = await escenario.persona('admin', { rol: ['miembro_registrado', 'admin'] });
    admin = await tokenDe(adminId, ['miembro_registrado', 'admin']);
    pastor = await tokenDe(await escenario.persona('pastor', { rol: ['miembro_registrado', 'pastor'] }), ['miembro_registrado', 'pastor']);
    discipulador = await tokenDe(await escenario.persona('discsesion', { rol: ['miembro_registrado', 'discipulador'] }), ['miembro_registrado', 'discipulador']);

    id.ana = await escenario.persona('ana');
    await prisma.persona.update({ where: { id: id.ana }, data: { fotoUrl: 'https://lh3.googleusercontent.com/foto-ana', origenAlta: 'admin', altaPor: adminId, consentimientoDatosFecha: new Date('2026-01-10T12:00:00Z'), consentimientoDatosOrigen: 'app' } });
    id.disc = await escenario.discipulador('disc');

    // H2.2: un pedido rechazado antes y un discipulado finalizado (con notas en su Encuentro, H2.7).
    await prisma.solicitudDiscipulado.create({ data: { personaId: id.ana, estado: 'rechazada', revisadoPorId: adminId, revisadaEn: new Date(Date.now() - 90 * DIA), createdAt: new Date(Date.now() - 100 * DIA) } });
    const { grupoId } = await escenario.grupo(id.disc, [id.ana], adminId);
    await prisma.grupo.update({ where: { id: grupoId }, data: { estado: 'finalizado', motivoCierre: 'completado', cerradoEn: new Date() } });
    await prisma.inscripcion.updateMany({ where: { grupoId }, data: { estado: 'completada', cerradaEn: new Date() } });
    await prisma.encuentro.create({ data: { grupoId, fecha: new Date('2026-09-01'), capitulos: '1', notas: 'texto-secreto-de-notas', registradoPorId: id.disc } });
    // H2.3: la Discipuladora tiene ese Grupo (ya cerrado) y otro vigente.
    await prisma.liderazgo.updateMany({ where: { grupoId }, data: { hasta: new Date() } });
    id.otra = await escenario.persona('otra');
    await escenario.grupo(id.disc, [id.otra], adminId);

    // H2.4: menores con tutor vinculado y con tutor cargado como texto; H2.5 la relación desde el tutor.
    id.menorVinc = await escenario.persona('menorvinc', { fechaNacimiento: new Date(`${anioMenor}-03-03`) });
    id.tutor = await escenario.persona('tutor');
    await prisma.relacionFamiliar.create({ data: { personaId: id.menorVinc, familiarId: id.tutor, tipoRelacion: 'tutor' } });
    id.menorTexto = await escenario.persona('menortexto', { fechaNacimiento: new Date(`${anioMenor}-04-04`) });
    await prisma.persona.update({ where: { id: id.menorTexto }, data: { tutorNombre: 'Marta', tutorApellido: 'Gómez', tutorTelefono: '+54 9 221 555 0000' } });
    // hijo_a guardada desde Ana: "tutor es hijo/a de Ana" → desde el tutor, Ana es su padre/madre.
    await prisma.relacionFamiliar.create({ data: { personaId: id.ana, familiarId: id.tutor, tipoRelacion: 'hijo_a' } });

    id.baja = await escenario.persona('baja');
    await prisma.persona.update({ where: { id: id.baja }, data: { activo: false } });
  });

  afterAll(async () => {
    await prisma.encuentro.deleteMany({ where: { registradoPorId: id.disc } });
    await escenario.limpiar();
    await app.close();
  });

  it('H2.1 / FR-011: los datos de la Persona, con foto, alta y consentimiento; nunca notas ni campos técnicos (H2.7)', async () => {
    const r = await get(`/personas/${id.ana}/perfil`);
    expect(r.status).toBe(200);
    const perfil = r.body as PerfilPersona;
    expect(perfil).toMatchObject({
      id: id.ana,
      nombre: 'ana',
      fotoUrl: 'https://lh3.googleusercontent.com/foto-ana',
      fechaNacimiento: '1990-05-20',
      sede: { id: escenario.sedeId, activa: true },
      congregaDesde: 2020,
      estado: 'activa',
      activo: true,
      usaLaApp: true,
      origenAlta: 'admin',
      altaPor: { id: adminId, nombre: 'admin' },
      consentimiento: { fecha: '2026-01-10T12:00:00.000Z', origen: 'app' },
      tutor: null,
      roles: { deCargo: [], delProceso: ['miembro_registrado'] },
    });
    expect(perfil.edad).toBeGreaterThanOrEqual(36);
    expect(perfil.quitar.admin).toEqual({ puede: true });
    expect(perfil.relaciones).toEqual([{ familiar: expect.objectContaining({ id: id.tutor }), relacion: 'hijo_a' }]);
    const json = JSON.stringify(r.body);
    expect(json).not.toContain('notas');
    expect(json).not.toContain('texto-secreto-de-notas');
    expect(json).not.toContain('adminSembrado');
    expect(json).not.toContain('temaPreferido');

    const sinFoto = await get(`/personas/${id.otra}/perfil`);
    expect(sinFoto.body).toMatchObject({ fotoUrl: null, altaPor: null, origenAlta: 'autorregistro' });
  });

  it('H2.2: el historial de Solicitudes (por la bandeja) y el Grupo finalizado que cursó', async () => {
    const solicitudes = await get(`/solicitudes?persona=${id.ana}&filtro=todas&orden=fecha&dir=desc&take=20`);
    expect(solicitudes.body.total).toBe(2);
    expect(solicitudes.body.items.map((s: SolicitudBandeja) => s.estado)).toEqual(['aprobada', 'rechazada']);

    const grupos = (await get(`/personas/${id.ana}/grupos`)).body as GruposDePersona;
    expect(grupos).toMatchObject({ totalCursados: 1, totalACargo: 0, aCargo: [] });
    expect(grupos.cursados[0]).toMatchObject({ estadoGrupo: 'finalizado', estadoInscripcion: 'completada', curso: { categoria: 'vida_nueva' }, hasta: expect.any(String) });
    expect(JSON.stringify(grupos)).not.toContain('notas');
  });

  it('H2.3: la Discipuladora ve los Grupos a cargo, vigentes y pasados, separados de los cursados', async () => {
    const grupos = (await get(`/personas/${id.disc}/grupos`)).body as GruposDePersona;
    expect(grupos.totalACargo).toBe(2);
    expect(grupos.totalCursados).toBe(0);
    // El más reciente primero: el vigente.
    expect(grupos.aCargo.map((g) => [g.estadoGrupo, g.hasta === null])).toEqual([
      ['en_curso', true],
      ['finalizado', false],
    ]);
    expect(grupos.aCargo[0].estadoInscripcion).toBeUndefined();
  });

  it('H2.4: el menor muestra su tutor — enlazado si es una Persona, o el cargado como texto', async () => {
    const vinculado = (await get(`/personas/${id.menorVinc}/perfil`)).body as PerfilPersona;
    expect(vinculado.edad).toBeLessThan(18);
    expect(vinculado.tutor).toMatchObject({ nombre: 'tutor', persona: { id: id.tutor } });
    expect(vinculado.relaciones).toEqual([{ familiar: expect.objectContaining({ id: id.tutor }), relacion: 'tutor_de' }]);

    const texto = (await get(`/personas/${id.menorTexto}/perfil`)).body as PerfilPersona;
    expect(texto.tutor).toEqual({ nombre: 'Marta', apellido: 'Gómez', telefono: '+54 9 221 555 0000', persona: null });
  });

  it('H2.5: la relación guardada desde el otro lado se ve con el nombre inverso', async () => {
    const tutor = (await get(`/personas/${id.tutor}/perfil`)).body as PerfilPersona;
    expect(tutor.tutor).toBeNull();
    expect(tutor.relaciones).toEqual(
      expect.arrayContaining([
        { familiar: expect.objectContaining({ id: id.menorVinc }), relacion: 'a_cargo_de' },
        { familiar: expect.objectContaining({ id: id.ana }), relacion: 'padre_madre' },
      ]),
    );
    expect(tutor.relaciones).toHaveLength(2);
  });

  it('FR-017 y H2.8: una Persona dada de baja se ve igual; un id que no existe es 404', async () => {
    const baja = await get(`/personas/${id.baja}/perfil`);
    expect(baja.status).toBe(200);
    expect(baja.body.activo).toBe(false);

    const inexistente = await get('/personas/00000000-0000-4000-8000-000000000000/perfil');
    expect(inexistente.status).toBe(404);
    expect(inexistente.body.code).toBe('NO_ENCONTRADO');
    expect((await get('/personas/no-es-un-id/perfil')).status).toBe(404);
    expect((await get('/personas/00000000-0000-4000-8000-000000000000/grupos')).status).toBe(404);
  });

  it('H2.6: el Pastor lee el perfil con contacto; un Discipulador no', async () => {
    const delPastor = await get(`/personas/${id.ana}/perfil`, pastor);
    expect(delPastor.status).toBe(200);
    expect(delPastor.body).toMatchObject({ telefono: expect.any(String), email: expect.any(String) });
    expect((await get(`/personas/${id.ana}/grupos`, pastor)).status).toBe(200);
    expect((await get(`/personas/${id.ana}/perfil`, discipulador)).status).toBe(403);
    expect((await get(`/personas/${id.ana}/grupos`, discipulador)).status).toBe(403);
  });

  it('FR-013: cada lista trae hasta 20, la más reciente primero, con el total', async () => {
    const muchas = await escenario.persona('muchas');
    const grupos: string[] = [];
    for (let i = 0; i < 21; i++) {
      const g = await prisma.grupo.create({ data: { cursoId: escenario.cursoId, sedeId: escenario.sedeId }, select: { id: true } });
      grupos.push(g.id);
      const solicitud = await prisma.solicitudDiscipulado.create({ data: { personaId: muchas, estado: 'aprobada', grupoId: g.id }, select: { id: true } });
      await prisma.inscripcion.create({ data: { personaId: muchas, grupoId: g.id, solicitudId: solicitud.id, createdAt: new Date(Date.now() - (21 - i) * DIA) } });
    }
    const r = (await get(`/personas/${muchas}/grupos`)).body as GruposDePersona;
    expect(r.totalCursados).toBe(21);
    expect(r.cursados).toHaveLength(20);
    expect(r.cursados[0].grupoId).toBe(grupos[20]);
    expect(r.cursados.map((g) => g.grupoId)).not.toContain(grupos[0]);
  });
});
