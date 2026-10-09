import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import { edadCumplidaEn, type EventoAviso, type EventoDetalle } from '@vida-sobrenatural/shared-types';
import type { PrismaService } from '../../src/prisma/prisma.service.js';
import { NotificacionesService } from '../../src/notificaciones/notificaciones.service.js';
import { BorradoRespuestasSensiblesService } from '../../src/evento/borrado-respuestas-sensibles.service.js';
import { registrarAvisos } from './camino-fixtures.js';
import { EN_UN_MES, EscenarioEventos, levantarApp, tokenDe } from './eventos-fixtures.js';

const DIA = 86_400_000;

/**
 * spec 011, ampliación 2026-10-09 — FR-064 a FR-069 (D221, D222): preguntas
 * propias del Evento, respuestas en el mismo paso de anotarse, quién ve las
 * sensibles, el resumen por pregunta, lo que no se puede cambiar con
 * respuestas y el borrado a los 30 días.
 */
describe('Preguntas propias de un Evento (integración)', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;
  let esc: EscenarioEventos;
  let admin: string;
  let pastor: string;
  let avisos: { emitidos: EventoAviso[]; restaurar: () => void };
  const http = () => request(app.getHttpServer());
  const comoAdmin = (r: request.Test) => r.set('Authorization', `Bearer ${admin}`);
  const como = async (clave: string) => {
    const id = await esc.persona(clave);
    return { id, token: await tokenDe(id, ['miembro_registrado']) };
  };
  const anotar = (eventoId: string, token: string, respuestas?: unknown) =>
    http().post(`/eventos/${eventoId}/inscripciones/me`).set('Authorization', `Bearer ${token}`).send(respuestas === undefined ? {} : { respuestas });

  const PREGUNTAS = [
    { texto: '¿Sos celíaca?', tipo: 'si_no', obligatoria: true, sensible: true },
    { texto: '¿Participaste alguna vez de una jornada de sanidad?', tipo: 'opcion', opciones: ['Sí, hace mucho', 'No, nunca'], obligatoria: false, sensible: false },
    { texto: '¿Algo que quieras contarnos?', tipo: 'texto', obligatoria: false, sensible: false },
  ];
  const crearJornada = async (extra: Record<string, unknown> = {}): Promise<EventoDetalle> => {
    const res = await comoAdmin(http().post('/eventos')).send({
      sedeId: esc.sedeId,
      nombre: `Jornada ${Math.random().toString(36).slice(2, 7)}`,
      descripcion: 'Jornada de sanidad.',
      inicio: EN_UN_MES().toISOString(),
      requiereInscripcion: true,
      preguntas: PREGUNTAS,
      ...extra,
    });
    expect(res.status).toBe(201);
    return res.body;
  };

  beforeAll(async () => {
    ({ app, prisma } = await levantarApp());
    esc = new EscenarioEventos(prisma, `preg${Date.now()}`);
    await esc.preparar();
    admin = await tokenDe(await esc.persona('admin', { rol: ['admin'] }), ['admin']);
    pastor = await tokenDe(await esc.persona('pastor', { rol: ['pastor'] }), ['pastor']);
    avisos = registrarAvisos(app.get(NotificacionesService));
  });
  afterAll(async () => {
    avisos.restaurar();
    await esc.limpiar();
    await app.close();
  });
  beforeEach(() => avisos.emitidos.splice(0));

  it('el Admin crea las preguntas en orden; la página pública las muestra (FR-064)', async () => {
    const ev = await crearJornada();
    expect(ev.preguntas.map((p) => [p.texto, p.tipo, p.obligatoria, p.sensible, p.respuestas])).toEqual([
      ['¿Sos celíaca?', 'si_no', true, true, 0],
      ['¿Participaste alguna vez de una jornada de sanidad?', 'opcion', false, false, 0],
      ['¿Algo que quieras contarnos?', 'texto', false, false, 0],
    ]);
    const publico = await http().get(`/eventos/publicos/${ev.slug}`);
    expect(publico.body.preguntas[1].opciones).toEqual(['Sí, hace mucho', 'No, nunca']);
  });

  it('errores de forma por campo; sin inscripción no lleva preguntas (FR-064)', async () => {
    const res = await comoAdmin(http().post('/eventos')).send({
      sedeId: esc.sedeId,
      nombre: 'Jornada con errores',
      descripcion: 'x',
      inicio: EN_UN_MES().toISOString(),
      requiereInscripcion: false,
      preguntas: [
        { texto: '', tipo: 'si_no', obligatoria: false, sensible: false },
        { texto: '¿Cuál?', tipo: 'opcion', opciones: ['Una'], obligatoria: false, sensible: false },
      ],
    });
    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual([
      { campo: 'pregunta-0-texto', code: 'PREGUNTA_TEXTO_REQUERIDO' },
      { campo: 'pregunta-1-opciones', code: 'PREGUNTA_OPCIONES_INVALIDAS' },
      { campo: 'preguntas', code: 'PREGUNTAS_SIN_INSCRIPCION' },
    ]);
  });

  it('anotarse sin la obligatoria no crea nada; con respuestas, quedan en la Inscripción y la Persona las ve (FR-065, FR-068)', async () => {
    const ev = await crearJornada();
    const [celiaca, jornada, texto] = ev.preguntas;
    const p = await como('ana');
    const sin = await anotar(ev.id, p.token, [{ preguntaId: jornada.id, valor: 'No, nunca' }]);
    expect(sin.status).toBe(400);
    expect(sin.body.errors).toEqual([{ campo: `respuesta-${celiaca.id}`, code: 'RESPUESTA_REQUERIDA' }]);
    expect(await prisma.inscripcionEvento.count({ where: { eventoId: ev.id } })).toBe(0);

    const invalida = await anotar(ev.id, p.token, [{ preguntaId: celiaca.id, valor: 'quizás' }]);
    expect(invalida.body.errors).toEqual([{ campo: `respuesta-${celiaca.id}`, code: 'RESPUESTA_INVALIDA' }]);

    const ok = await anotar(ev.id, p.token, [
      { preguntaId: celiaca.id, valor: 'si' },
      { preguntaId: jornada.id, valor: 'No, nunca' },
      { preguntaId: texto.id, valor: 'Vengo con mi hermana' },
    ]);
    expect(ok.status).toBe(201);
    const mia = await http().get(`/eventos/${ev.id}/mi-inscripcion`).set('Authorization', `Bearer ${p.token}`);
    expect(mia.body.respuestas).toEqual([
      { preguntaId: celiaca.id, pregunta: '¿Sos celíaca?', tipo: 'si_no', sensible: true, valor: 'si' },
      { preguntaId: jornada.id, pregunta: '¿Participaste alguna vez de una jornada de sanidad?', tipo: 'opcion', sensible: false, valor: 'No, nunca' },
      { preguntaId: texto.id, pregunta: '¿Algo que quieras contarnos?', tipo: 'texto', sensible: false, valor: 'Vengo con mi hermana' },
    ]);
    // Las respuestas viven solo en la Inscripción, nunca en el perfil (D222).
    const persona = await prisma.persona.findUniqueOrThrow({ where: { id: p.id } });
    expect(JSON.stringify(persona)).not.toContain('Vengo con mi hermana');
  });

  it('también en la lista de espera y en nombre de otra Persona (FR-065)', async () => {
    const ev = await crearJornada({ cupo: 1, permiteListaEspera: true });
    const celiaca = ev.preguntas[0].id;
    await esc.inscripcion(ev.id, await esc.persona('ocupa'));
    const p = await como('lista');
    const r = await anotar(ev.id, p.token, [{ preguntaId: celiaca, valor: 'no' }]);
    expect(r.body.estado).toBe('lista_espera');
    expect(await prisma.respuestaPreguntaEvento.count({ where: { inscripcionId: r.body.id } })).toBe(1);

    const otra = await esc.persona('otra');
    const sin = await comoAdmin(http().post(`/eventos/${ev.id}/inscripciones`)).send({ personaId: otra });
    expect(sin.body.errors).toEqual([{ campo: `respuesta-${celiaca}`, code: 'RESPUESTA_REQUERIDA' }]);
    const con = await comoAdmin(http().post(`/eventos/${ev.id}/inscripciones`)).send({ personaId: otra, respuestas: [{ preguntaId: celiaca, valor: 'si' }] });
    expect(con.status).toBe(201);
    expect(con.body.respuestas).toEqual([expect.objectContaining({ preguntaId: celiaca, valor: 'si', sensible: true })]);
  });

  it('el Admin ve respuestas y resumen; el Pastor no ve lo sensible; nada viaja en los avisos (FR-067, FR-068)', async () => {
    const ev = await crearJornada({ requiereAprobacion: true });
    const [celiaca, jornada, texto] = ev.preguntas;
    const respuestas: Array<[string, string]> = [
      ['si', 'Sí, hace mucho'],
      ['no', 'No, nunca'],
      ['no', 'No, nunca'],
    ];
    for (const [i, [c, j]] of respuestas.entries()) {
      const p = await como(`resumen${i}`);
      const r = await anotar(ev.id, p.token, [
        { preguntaId: celiaca.id, valor: c },
        { preguntaId: jornada.id, valor: j },
        { preguntaId: texto.id, valor: `Dato-privado-${i}` },
      ]);
      expect(r.status).toBe(201);
    }
    expect(avisos.emitidos.length).toBeGreaterThan(0);
    expect(JSON.stringify(avisos.emitidos)).not.toMatch(/Dato-privado|No, nunca|celíaca/);

    const lista = await comoAdmin(http().get(`/eventos/${ev.id}/inscripciones?estado=pendiente`));
    expect(lista.body.items[0].respuestas.map((r: { preguntaId: string }) => r.preguntaId)).toEqual([celiaca.id, jornada.id, texto.id]);
    const resumen = await comoAdmin(http().get(`/eventos/${ev.id}/preguntas/resumen`));
    expect(resumen.body).toEqual([
      { preguntaId: celiaca.id, texto: '¿Sos celíaca?', tipo: 'si_no', sensible: true, conteos: [{ valor: 'si', cantidad: 1 }, { valor: 'no', cantidad: 2 }], respondidas: 3 },
      {
        preguntaId: jornada.id,
        texto: '¿Participaste alguna vez de una jornada de sanidad?',
        tipo: 'opcion',
        sensible: false,
        conteos: [{ valor: 'Sí, hace mucho', cantidad: 1 }, { valor: 'No, nunca', cantidad: 2 }],
        respondidas: 3,
      },
      { preguntaId: texto.id, texto: '¿Algo que quieras contarnos?', tipo: 'texto', sensible: false, conteos: [], respondidas: 3 },
    ]);

    const listaPastor = await http().get(`/eventos/${ev.id}/inscripciones?estado=pendiente`).set('Authorization', `Bearer ${pastor}`);
    expect(listaPastor.status).toBe(200);
    for (const item of listaPastor.body.items) expect(item.respuestas.map((r: { preguntaId: string }) => r.preguntaId)).toEqual([jornada.id, texto.id]);
    const resumenPastor = await http().get(`/eventos/${ev.id}/preguntas/resumen`).set('Authorization', `Bearer ${pastor}`);
    expect(resumenPastor.body.map((r: { preguntaId: string }) => r.preguntaId)).toEqual([jornada.id, texto.id]);
    const una = await http().get(`/inscripciones-evento/${listaPastor.body.items[0].id}`).set('Authorization', `Bearer ${pastor}`);
    expect(una.body.respuestas.some((r: { sensible: boolean }) => r.sensible)).toBe(false);
  });

  it('con respuestas: no se borra ni cambia de tipo ni pierde opciones; el texto sí se edita (FR-066)', async () => {
    const ev = await crearJornada();
    const [celiaca, jornada, texto] = ev.preguntas;
    const p = await como('editar');
    await anotar(ev.id, p.token, [
      { preguntaId: celiaca.id, valor: 'no' },
      { preguntaId: jornada.id, valor: 'Sí, hace mucho' },
    ]);
    const base = (cambios: Record<string, unknown>[]) => comoAdmin(http().patch(`/eventos/${ev.id}`)).send({ preguntas: cambios });
    const c = { id: celiaca.id, texto: celiaca.texto, tipo: 'si_no', obligatoria: true, sensible: true };
    const j = { id: jornada.id, texto: jornada.texto, tipo: 'opcion', opciones: jornada.opciones, obligatoria: false, sensible: false };

    const borrar = await base([j]);
    expect(borrar.status).toBe(409);
    expect(borrar.body.code).toBe('PREGUNTA_CON_RESPUESTAS');
    expect((await base([{ ...c, tipo: 'texto' }, j])).body.errors).toEqual([{ campo: 'pregunta-0-tipo', code: 'PREGUNTA_CON_RESPUESTAS' }]);
    expect((await base([c, { ...j, opciones: ['No, nunca', 'Otra'] }])).body.errors).toEqual([{ campo: 'pregunta-1-opciones', code: 'PREGUNTA_CON_RESPUESTAS' }]);
    expect((await base([{ ...c, sensible: false }, j])).body.code).toBe('PREGUNTA_CON_RESPUESTAS');

    // Editar el texto, reordenar, sumar una opción y quitar la que no tiene respuestas: sí.
    const ok = await base([{ ...j, opciones: [...jornada.opciones, 'Sí, este año'] }, { ...c, texto: '¿Sos celíaca o tenés alguna restricción?' }]);
    expect(ok.status).toBe(200);
    expect(ok.body.preguntas.map((x: { texto: string; respuestas: number }) => [x.texto, x.respuestas])).toEqual([
      ['¿Participaste alguna vez de una jornada de sanidad?', 1],
      ['¿Sos celíaca o tenés alguna restricción?', 1],
    ]);
    expect(await prisma.preguntaEvento.count({ where: { id: texto.id } })).toBe(0);
  });

  it('borra las respuestas sensibles 30 días después del Evento, y solo esas (FR-069)', async () => {
    const borrado = app.get(BorradoRespuestasSensiblesService);
    const crearPasado = async (diasDesdeElFin: number) => {
      const ev = await esc.evento({ inicio: new Date(Date.now() - (diasDesdeElFin + 1) * DIA), fin: new Date(Date.now() - diasDesdeElFin * DIA) });
      const sensible = await prisma.preguntaEvento.create({ data: { eventoId: ev.id, orden: 0, texto: '¿Celíaca?', tipo: 'si_no', sensible: true } });
      const comun = await prisma.preguntaEvento.create({ data: { eventoId: ev.id, orden: 1, texto: '¿Viniste antes?', tipo: 'si_no' } });
      const insc = await esc.inscripcion(ev.id, await esc.persona(`pasado${diasDesdeElFin}`));
      await prisma.respuestaPreguntaEvento.createMany({
        data: [
          { inscripcionId: insc, preguntaId: sensible.id, valor: 'si' },
          { inscripcionId: insc, preguntaId: comun.id, valor: 'no' },
        ],
      });
      return { ev, sensible, comun };
    };
    const viejo = await crearPasado(31);
    const reciente = await crearPasado(29);

    await borrado.correr();
    expect(await prisma.respuestaPreguntaEvento.count({ where: { preguntaId: viejo.sensible.id } })).toBe(0);
    expect(await prisma.respuestaPreguntaEvento.count({ where: { preguntaId: viejo.comun.id } })).toBe(1);
    expect(await prisma.respuestaPreguntaEvento.count({ where: { preguntaId: reciente.sensible.id } })).toBe(1);
    expect((await prisma.evento.findUniqueOrThrow({ where: { id: viejo.ev.id } })).respuestasSensiblesBorradasEn).not.toBeNull();
    expect((await prisma.evento.findUniqueOrThrow({ where: { id: reciente.ev.id } })).respuestasSensiblesBorradasEn).toBeNull();

    // Idempotente: una segunda vuelta no vuelve a tocar el Evento ya limpio.
    const marca = (await prisma.evento.findUniqueOrThrow({ where: { id: viejo.ev.id } })).respuestasSensiblesBorradasEn;
    await borrado.correr();
    expect((await prisma.evento.findUniqueOrThrow({ where: { id: viejo.ev.id } })).respuestasSensiblesBorradasEn).toEqual(marca);
  });

  it('la lista trae lo que la app ya sabe: edad al día del Evento, teléfono, Ministerio y quien la acompaña (FR-070)', async () => {
    const ev = await crearJornada({ preguntas: [] });
    const persona = await esc.persona('sabida', { fechaNacimiento: new Date('2000-01-01') });
    const discipuladora = await esc.persona('laura');
    const ministerio = await prisma.ministerio.create({ data: { nombre: `Alabanza ${esc.sufijo}`, descripcion: 'x' } });
    const postulacion = await prisma.postulacion.create({ data: { personaId: persona, ministerioId: ministerio.id, estado: 'aprobada', revisadoPorId: discipuladora, revisadaEn: new Date() } });
    const curso =
      (await prisma.curso.findFirst({ where: { categoria: 'vida_nueva', tipo: 'individual' } })) ??
      (await prisma.curso.create({ data: { nombre: 'Vida Nueva', categoria: 'vida_nueva', tipo: 'individual', modalidad: 'seguimiento_por_encuentros' } }));
    const grupo = await prisma.grupo.create({ data: { cursoId: curso.id, sedeId: esc.sedeId } });
    await prisma.liderazgo.create({ data: { personaId: discipuladora, grupoId: grupo.id } });
    await prisma.inscripcion.create({ data: { personaId: persona, grupoId: grupo.id, solicitudId: randomUUID() } });
    try {
      await esc.inscripcion(ev.id, persona);
      const lista = await comoAdmin(http().get(`/eventos/${ev.id}/inscripciones?estado=confirmada`));
      expect(lista.body.items[0].datosPersona).toEqual({
        edad: edadCumplidaEn('2000-01-01', ev.inicio),
        telefono: '+5492211234567',
        ministerios: [`Alabanza ${esc.sufijo}`],
        referente: `laura Eventos${esc.sufijo}`,
        grupoExtension: null,
      });
    } finally {
      await prisma.inscripcion.deleteMany({ where: { grupoId: grupo.id } });
      await prisma.liderazgo.deleteMany({ where: { grupoId: grupo.id } });
      await prisma.grupo.delete({ where: { id: grupo.id } });
      await prisma.postulacion.delete({ where: { id: postulacion.id } });
      await prisma.ministerio.delete({ where: { id: ministerio.id } });
    }
  });
});
