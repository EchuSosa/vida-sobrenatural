import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import type { PrismaService } from '../../src/prisma/prisma.service.js';
import { EN_UN_MES, EscenarioEventos, levantarApp, tokenDe } from './eventos-fixtures.js';

/**
 * spec 011, ampliación 2026-10-09 — FR-060 a FR-063 (D220): destinatarios con
 * efecto. Mujeres desde 15 años: una de 20 se anota; un varón y una de 14, no
 * (tampoco a la lista de espera); el Admin puede forzar con `forzar: true`.
 */
describe('Destinatarios de un Evento (integración)', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;
  let esc: EscenarioEventos;
  let admin: string;
  const http = () => request(app.getHttpServer());
  const hace = (anios: number) => new Date(Date.UTC(new Date().getUTCFullYear() - anios, 0, 1));
  const como = async (clave: string, genero: 'femenino' | 'masculino', anios: number) => {
    const id = await esc.persona(clave, { genero, fechaNacimiento: hace(anios) });
    return { id, token: await tokenDe(id, ['miembro_registrado']) };
  };
  const anotar = (eventoId: string, token: string) => http().post(`/eventos/${eventoId}/inscripciones/me`).set('Authorization', `Bearer ${token}`).send({});
  const mujeresDesde15 = () => esc.evento({ destinatariosGenero: 'mujeres', edadMinima: 15 });

  beforeAll(async () => {
    ({ app, prisma } = await levantarApp());
    esc = new EscenarioEventos(prisma, `dest${Date.now()}`);
    await esc.preparar();
    admin = await tokenDe(await esc.persona('admin', { rol: ['admin'] }), ['admin']);
  });
  afterAll(async () => {
    await esc.limpiar();
    await app.close();
  });

  it('el Admin guarda género y edades; la página pública los devuelve (FR-060)', async () => {
    const res = await http()
      .post('/eventos')
      .set('Authorization', `Bearer ${admin}`)
      .send({
        sedeId: esc.sedeId,
        nombre: `Jornada ${esc.sufijo}`,
        descripcion: 'Jornada de sanidad.',
        inicio: EN_UN_MES().toISOString(),
        requiereInscripcion: true,
        destinatariosGenero: 'mujeres',
        edadMinima: 15,
      });
    expect(res.status).toBe(201);
    expect(res.body.destinatarios).toEqual({ genero: 'mujeres', edadMinima: 15, edadMaxima: null });
    const publico = await http().get(`/eventos/publicos/${res.body.slug}`);
    expect(publico.body.destinatarios).toEqual({ genero: 'mujeres', edadMinima: 15, edadMaxima: null });

    const editado = await http().patch(`/eventos/${res.body.id}`).set('Authorization', `Bearer ${admin}`).send({ edadMaxima: 12 });
    expect(editado.status).toBe(400);
    expect(editado.body.errors).toEqual([{ campo: 'edadMaxima', code: 'EDAD_MAXIMA_MENOR_A_MINIMA' }]);
  });

  it('una mujer de 20 se anota; un varón y una de 14 reciben EVENTO_NO_CORRESPONDE (FR-061)', async () => {
    const ev = await mujeresDesde15();
    const mujer = await como('mujer20', 'femenino', 20);
    expect((await anotar(ev.id, mujer.token)).status).toBe(201);

    const varon = await como('varon', 'masculino', 30);
    const r = await anotar(ev.id, varon.token);
    expect(r.status).toBe(403);
    expect(r.body.code).toBe('EVENTO_NO_CORRESPONDE');
    const menor = await como('menor14', 'femenino', 14);
    expect((await anotar(ev.id, menor.token)).body.code).toBe('EVENTO_NO_CORRESPONDE');
    expect(await prisma.inscripcionEvento.count({ where: { eventoId: ev.id } })).toBe(1);
  });

  it('tampoco a la lista de espera (FR-061)', async () => {
    const ev = await esc.evento({ destinatariosGenero: 'mujeres', cupo: 1, permiteListaEspera: true });
    await esc.inscripcion(ev.id, await esc.persona('ocupa'));
    const varon = await como('varonlista', 'masculino', 30);
    expect((await anotar(ev.id, varon.token)).body.code).toBe('EVENTO_NO_CORRESPONDE');
    const mujer = await como('mujerlista', 'femenino', 30);
    expect((await anotar(ev.id, mujer.token)).body.estado).toBe('lista_espera');
  });

  it('mi-inscripcion dice si corresponde (FR-061)', async () => {
    const ev = await mujeresDesde15();
    const varon = await como('varonmira', 'masculino', 30);
    const mujer = await como('mujermira', 'femenino', 30);
    const ver = (token: string) => http().get(`/eventos/${ev.id}/mi-inscripcion`).set('Authorization', `Bearer ${token}`);
    expect((await ver(varon.token)).body.corresponde).toBe(false);
    expect((await ver(mujer.token)).body.corresponde).toBe(true);
  });

  it('en nombre de otra: sin forzar, EVENTO_NO_CORRESPONDE; con forzar, queda marcada (FR-062)', async () => {
    const ev = await mujeresDesde15();
    const varon = await esc.persona('varonadmin', { genero: 'masculino' });
    const sinForzar = await http().post(`/eventos/${ev.id}/inscripciones`).set('Authorization', `Bearer ${admin}`).send({ personaId: varon });
    expect(sinForzar.status).toBe(409);
    expect(sinForzar.body.code).toBe('EVENTO_NO_CORRESPONDE');
    const forzada = await http().post(`/eventos/${ev.id}/inscripciones`).set('Authorization', `Bearer ${admin}`).send({ personaId: varon, forzar: true });
    expect(forzada.status).toBe(201);
    expect(forzada.body).toMatchObject({ estado: 'confirmada', fueraDeDestinatarios: true });

    const mujer = await esc.persona('mujeradmin', { genero: 'femenino', fechaNacimiento: hace(40) });
    const normal = await http().post(`/eventos/${ev.id}/inscripciones`).set('Authorization', `Bearer ${admin}`).send({ personaId: mujer });
    expect(normal.body).toMatchObject({ estado: 'confirmada', fueraDeDestinatarios: false, datosPersona: { telefono: '+5492211234567' } });
  });

  it('si el Admin cambia los destinatarios, las que ya no cumplen quedan marcadas y siguen anotadas (FR-062b)', async () => {
    const ev = await esc.evento();
    const varon = await esc.persona('varoncambio', { genero: 'masculino' });
    const mujer = await esc.persona('mujercambio', { genero: 'femenino', fechaNacimiento: hace(30) });
    const iVaron = await esc.inscripcion(ev.id, varon);
    await esc.inscripcion(ev.id, mujer);
    const editado = await http().patch(`/eventos/${ev.id}`).set('Authorization', `Bearer ${admin}`).send({ destinatariosGenero: 'mujeres' });
    expect(editado.status).toBe(200);
    const lista = await http().get(`/eventos/${ev.id}/inscripciones?estado=confirmada`).set('Authorization', `Bearer ${admin}`);
    const porPersona = Object.fromEntries(lista.body.items.map((i: { persona: { id: string }; yaNoCorresponde: boolean }) => [i.persona.id, i.yaNoCorresponde]));
    expect(porPersona).toEqual({ [varon]: true, [mujer]: false });
    expect((await prisma.inscripcionEvento.findUniqueOrThrow({ where: { id: iVaron } })).estado).toBe('confirmada');
  });
});
