import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { Server } from 'node:http';
import type { PrismaService } from '../../src/prisma/prisma.service.js';
import {
  discipuladosActivosDe,
  discipuladosActivosDeVarias,
  propuestasPendientesDe,
  propuestasPendientesDeVarias,
} from '../../src/discipulado/discipulados-activos.js';
import { Escenario, levantarApp, tokenDe } from './discipulado-fixtures.js';

/**
 * specs/004, T011 (D137, FR-043), contra la base real: el criterio ÚNICO de
 * "discipulado activo" es un Liderazgo vigente (`hasta = null`) en un Grupo
 * `en_curso`, y "propuesta pendiente" es `estado = pendiente`. Cada caso
 * aísla una de las dos condiciones: la reasignación cierra el Liderazgo con
 * el Grupo todavía en curso, y el Grupo finalizado deja el Liderazgo abierto.
 * Las versiones `…DeVarias` (listado de Personas) tienen que decir lo mismo.
 */
describe('Discipulados activos y propuestas pendientes (integración)', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;
  let esc: Escenario;
  let admin: string;
  let tokenAdmin: string;

  beforeAll(async () => {
    ({ app, prisma } = await levantarApp());
    esc = new Escenario(prisma, `activos-${Date.now()}`);
    await esc.preparar();
    admin = await esc.persona('admin', { rol: ['miembro_registrado', 'admin'] });
    tokenAdmin = await tokenDe(admin, ['miembro_registrado', 'admin']);
  });

  afterAll(async () => {
    await esc.limpiar();
    await app.close();
  });

  const http = () => request(app.getHttpServer());

  async function activosSegunLasDos(personaId: string) {
    const deUna = await discipuladosActivosDe(prisma, personaId);
    const deVarias = (await discipuladosActivosDeVarias(prisma, [personaId])).get(personaId);
    expect(deVarias).toEqual(deUna);
    return deUna;
  }

  async function propuestasSegunLasDos(personaId: string) {
    const deUna = await propuestasPendientesDe(prisma, personaId);
    const deVarias = (await propuestasPendientesDeVarias(prisma, [personaId])).get(personaId);
    expect(deVarias).toEqual(deUna);
    return deUna;
  }

  it('un Liderazgo vigente en un Grupo en curso cuenta, con el nombre de su Persona', async () => {
    const disc = await esc.discipulador('vigente');
    const { grupoId } = await esc.grupo(disc, [await esc.persona('ines')], admin);

    expect(await activosSegunLasDos(disc)).toEqual([{ grupoId, persona: { nombre: 'ines', apellido: expect.stringMatching(/^Test/) } }]);
  });

  it('un Liderazgo cerrado por reasignación no cuenta, aunque el Grupo siga en curso', async () => {
    const viejo = await esc.discipulador('reasignado-viejo');
    const nuevo = await esc.discipulador('reasignado-nuevo');
    const { grupoId } = await esc.grupo(viejo, [await esc.persona('juana')], admin);

    const propuesta = await http().post(`/grupos/discipulados/${grupoId}/reasignar`).set('Authorization', `Bearer ${tokenAdmin}`).send({ discipuladorId: nuevo });
    expect(propuesta.status).toBe(200);
    // Mientras la reasignación no se acepta, el anterior sigue a cargo y el nuevo la tiene como propuesta.
    expect(await activosSegunLasDos(viejo)).toHaveLength(1);
    expect(await propuestasSegunLasDos(nuevo)).toEqual([expect.objectContaining({ propuestaId: propuesta.body.propuestaId, solicitudId: null, grupoId })]);

    const tokenNuevo = await tokenDe(nuevo, ['miembro_registrado', 'discipulador']);
    expect((await http().post(`/discipulado/propuestas/${propuesta.body.propuestaId}/aceptar`).set('Authorization', `Bearer ${tokenNuevo}`)).status).toBe(200);

    expect((await prisma.grupo.findUnique({ where: { id: grupoId }, select: { estado: true } }))?.estado).toBe('en_curso');
    expect(await activosSegunLasDos(viejo)).toEqual([]);
    expect(await activosSegunLasDos(nuevo)).toEqual([expect.objectContaining({ grupoId })]);
    expect(await propuestasSegunLasDos(nuevo)).toEqual([]);
  });

  it('un Grupo finalizado no cuenta, aunque su Liderazgo haya quedado abierto', async () => {
    const disc = await esc.discipulador('finalizado');
    const { grupoId } = await esc.grupo(disc, [await esc.persona('karina')], admin);
    await prisma.grupo.update({ where: { id: grupoId }, data: { estado: 'finalizado', motivoCierre: 'completado', cerradoEn: new Date() } });

    expect(await prisma.liderazgo.findFirst({ where: { grupoId, personaId: disc }, select: { hasta: true } })).toEqual({ hasta: null });
    expect(await activosSegunLasDos(disc)).toEqual([]);
  });

  it('una propuesta pendiente cuenta como propuesta (no como discipulado); declinada, no', async () => {
    const disc = await esc.discipulador('propuestas');
    const persona = await esc.persona('lola');
    const { solicitudId, propuestaId } = await esc.propuestaNueva(persona, disc, admin);

    expect(await activosSegunLasDos(disc)).toEqual([]);
    expect(await propuestasSegunLasDos(disc)).toEqual([
      { propuestaId, persona: { nombre: 'lola', apellido: expect.stringMatching(/^Test/) }, solicitudId, grupoId: null },
    ]);

    const tokenDisc = await tokenDe(disc, ['miembro_registrado', 'discipulador']);
    const declinar = await http().post(`/discipulado/propuestas/${propuestaId}/declinar`).set('Authorization', `Bearer ${tokenDisc}`).send({ motivo: 'Ese día no puedo' });
    expect(declinar.status).toBe(200);

    expect(await propuestasSegunLasDos(disc)).toEqual([]);
  });
});
