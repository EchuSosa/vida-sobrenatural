import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import type {
  DetalleEleccionAdmin,
  DetalleEleccionLider,
  EleccionesDeMiGrupo,
  EstadoMiMinisterio,
  MiEleccionMinisterio,
  OpcionElegida,
  SolicitudBandeja,
} from '@vida-sobrenatural/shared-types';
import type { PrismaService } from '../../src/prisma/prisma.service.js';
import { NotificacionesService } from '../../src/notificaciones/notificaciones.service.js';
import { levantarApp, tokenDe } from './discipulado-fixtures.js';
import { registrarAvisos } from './camino-fixtures.js';
import { EscenarioVS } from './vida-de-servicio-fixtures.js';
import { ESPERA_CANDADO_CURSOS } from './candado-cursos.js';

/**
 * spec 015 (D239–D242): la elección de ministerio de punta a punta — el Admin
 * la abre en la edición, la persona elige (hasta 2 Ministerios, un área de
 * cada uno, Discipulados Vida Nueva aparte), el líder de Vida de Servicio
 * hace la charla con notas privadas y el Admin confirma cada área, que crea
 * la membresía (D241: sumar o reemplazar).
 */
describe('Elección de ministerio (spec 015, integración)', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;
  let vs: EscenarioVS;
  let avisos: ReturnType<typeof registrarAvisos>;
  let lider: string;
  let otroLider: string;
  let adminId: string;
  let pastorId: string;
  let g: string;
  let ana: string;
  let beto: string;
  let caro: string;
  const ministerios: string[] = [];
  const area: Record<string, { ministerioId: string; celulaId: string }> = {};
  const LIDER = ['miembro_registrado', 'lider_curso'];
  const ADMIN = ['miembro_registrado', 'admin'];
  const PASTOR = ['miembro_registrado', 'pastor'];
  const MIEMBRO = ['miembro_registrado'];

  async function como(personaId: string, rol: string[], metodo: 'get' | 'post' | 'put', ruta: string, cuerpo?: object) {
    const req = request(app.getHttpServer())[metodo](ruta).set('Authorization', `Bearer ${await tokenDe(personaId, rol)}`);
    return cuerpo ? req.send(cuerpo) : req;
  }
  const opcion = (...claves: string[]): OpcionElegida[] => claves.map((c) => area[c]);

  async function ministerio(nombre: string, celulas: Array<{ nombre: string; paralelo?: boolean }>, requiereFormacion = false) {
    const m = await prisma.ministerio.create({ data: { nombre: `${nombre} ${Date.now()}`, descripcion: 'Test', requiereFormacion }, select: { id: true } });
    ministerios.push(m.id);
    for (const c of celulas) {
      const celula = await prisma.celula.create({ data: { ministerioId: m.id, nombre: c.nombre, ofreceRolDiscipulador: c.paralelo ?? false }, select: { id: true } });
      area[c.nombre] = { ministerioId: m.id, celulaId: celula.id };
    }
  }

  beforeAll(async () => {
    ({ app, prisma } = await levantarApp());
    avisos = registrarAvisos(app.get(NotificacionesService));
    vs = new EscenarioVS(prisma, `elm-${Date.now()}`);
    await vs.preparar();
    lider = await vs.lider('lider');
    otroLider = await vs.lider('otrolider');
    adminId = await vs.persona('admin', { rol: ADMIN });
    pastorId = await vs.persona('pastor', { rol: PASTOR });
    await ministerio('Bienvenida', [{ nombre: 'Consolidadores' }, { nombre: 'Seguridad' }]);
    await ministerio('Multimedia', [{ nombre: 'Fotografía' }], true);
    await ministerio('Mesa', [{ nombre: 'Informes' }]);
    await ministerio('Enseñanza', [{ nombre: 'Discipulados Vida Nueva', paralelo: true }], true);
    g = await vs.edicion({ lideres: [lider] });
    await vs.edicion({ lideres: [otroLider] });
    ana = await vs.apta('ana');
    beto = await vs.apta('beto');
    caro = await vs.apta('caro');
    for (const p of [ana, beto, caro]) await vs.inscribir(p, g);
  }, ESPERA_CANDADO_CURSOS);

  afterAll(async () => {
    avisos.restaurar();
    await prisma.eleccionMinisterio.deleteMany({ where: { grupoId: g } });
    await prisma.postulacion.deleteMany({ where: { ministerioId: { in: ministerios } } });
    await prisma.celula.deleteMany({ where: { ministerioId: { in: ministerios } } });
    await prisma.ministerio.deleteMany({ where: { id: { in: ministerios } } });
    await vs.limpiar();
    await app.close();
  });

  it('⭐ el Admin la abre (aviso a las inscriptas) y la persona elige con la regla de D239', async () => {
    expect((await como(ana, MIEMBRO, 'get', '/elecciones-ministerio/me')).body).toEqual({ disponible: false });
    expect((await como(ana, MIEMBRO, 'put', '/elecciones-ministerio/me', { opciones: opcion('Consolidadores') })).body.code).toBe('ELECCION_NO_DISPONIBLE');

    avisos.emitidos.length = 0;
    const abrir = await como(adminId, ADMIN, 'put', `/grupos/vida-de-servicio/${g}/eleccion-abierta`, { abierta: true });
    expect([abrir.status, abrir.body.eleccionAbierta]).toEqual([200, true]);
    expect(avisos.emitidos.filter((e) => e.nombre === 'ministerio.eleccion_abierta')).toEqual([
      { nombre: 'ministerio.eleccion_abierta', a: { tipo: 'grupo', grupoId: g }, datos: { grupoId: g } },
    ]);
    expect((await como(ana, MIEMBRO, 'get', '/elecciones-ministerio/me/resumen')).body).toMatchObject({ estado: 'puede_elegir' });

    const mia = (await como(ana, MIEMBRO, 'get', '/elecciones-ministerio/me')).body as MiEleccionMinisterio;
    expect(mia).toMatchObject({ disponible: true, abierta: true, editable: true, eleccion: null, conocido: { nombre: 'ana' } });
    if (!mia.disponible) throw new Error('no disponible');
    const deEste = mia.catalogo.filter((m) => ministerios.includes(m.id));
    expect(deEste.map((m) => m.requiereFormacion).sort()).toEqual([false, false, true, true]);

    const errores = async (claves: string[]) => (await como(ana, MIEMBRO, 'put', '/elecciones-ministerio/me', { opciones: opcion(...claves) })).body.errors;
    expect(await errores([])).toEqual([{ campo: 'opciones', code: 'ELECCION_VACIA' }]);
    expect(await errores(['Consolidadores', 'Seguridad'])).toEqual([{ campo: 'opciones', code: 'ELECCION_UN_AREA_POR_MINISTERIO' }]);
    expect(await errores(['Consolidadores', 'Fotografía', 'Informes'])).toEqual([{ campo: 'opciones', code: 'ELECCION_MAXIMO_MINISTERIOS' }]);

    // Dos Ministerios más Discipulados Vida Nueva (no cuenta, D217).
    const ok = await como(ana, MIEMBRO, 'put', '/elecciones-ministerio/me', { opciones: opcion('Consolidadores', 'Fotografía', 'Discipulados Vida Nueva'), comentario: ' Me gusta recibir gente ' });
    expect(ok.status).toBe(200);
    expect(ok.body.eleccion).toMatchObject({ estado: 'borrador', comentario: 'Me gusta recibir gente' });
    expect(ok.body.eleccion.opciones.map((o: { celula: { nombre: string } }) => o.celula.nombre)).toEqual(['Consolidadores', 'Fotografía', 'Discipulados Vida Nueva']);
    expect((await como(ana, MIEMBRO, 'get', '/elecciones-ministerio/me/resumen')).body).toMatchObject({ estado: 'borrador', editable: true });
  });

  it('⭐ la charla del líder: notas privadas, "Charla hecha" la manda al Admin; un líder de otra edición no la ve', async () => {
    const lista = (await como(lider, LIDER, 'get', `/vida-de-servicio/mis-grupos/${g}/elecciones`)).body as EleccionesDeMiGrupo;
    expect(lista.eleccionAbierta).toBe(true);
    expect(lista.personas.find((p) => p.persona.id === ana)?.eleccion?.estado).toBe('borrador');
    expect(lista.personas.find((p) => p.persona.id === beto)?.eleccion).toBeNull();
    expect((await como(otroLider, LIDER, 'get', `/vida-de-servicio/mis-grupos/${g}/elecciones/${ana}`)).status).toBe(404);

    const detalle = (await como(lider, LIDER, 'get', `/vida-de-servicio/mis-grupos/${g}/elecciones/${ana}`)).body as DetalleEleccionLider;
    expect(detalle).toMatchObject({ opcionesEditables: true, notasEditables: true, persona: { id: ana } });
    avisos.emitidos.length = 0;
    const charla = await como(lider, LIDER, 'put', `/vida-de-servicio/mis-grupos/${g}/elecciones/${ana}`, {
      opciones: opcion('Consolidadores', 'Fotografía', 'Discipulados Vida Nueva'),
      notas: 'Muy servicial, NOTA-PRIVADA',
      charlaHecha: true,
      version: detalle.eleccion!.version,
    });
    expect(charla.status).toBe(200);
    expect(charla.body.eleccion).toMatchObject({ estado: 'charla_hecha', notas: 'Muy servicial, NOTA-PRIVADA', charlaPor: { id: lider } });
    expect(avisos.emitidos.map((e) => e.nombre)).toEqual(['ministerio.eleccion_lista']);
    // Una versión vieja no pisa lo nuevo.
    const vieja = await como(lider, LIDER, 'put', `/vida-de-servicio/mis-grupos/${g}/elecciones/${ana}`, { opciones: opcion('Consolidadores'), version: detalle.eleccion!.version });
    expect(vieja.body.code).toBe('ELECCION_DESACTUALIZADA');

    // La persona ya no la cambia, y nunca ve las notas.
    const mia = await como(ana, MIEMBRO, 'get', '/elecciones-ministerio/me');
    expect(mia.body).toMatchObject({ editable: false, eleccion: { estado: 'charla_hecha' } });
    expect(JSON.stringify(mia.body)).not.toContain('NOTA-PRIVADA');
    expect((await como(ana, MIEMBRO, 'put', '/elecciones-ministerio/me', { opciones: opcion('Informes') })).body.code).toBe('ELECCION_YA_CHARLADA');

    // Beto no eligió: el líder la carga por él en la charla (D97).
    const porBeto = await como(lider, LIDER, 'put', `/vida-de-servicio/mis-grupos/${g}/elecciones/${beto}`, { opciones: opcion('Informes'), charlaHecha: true });
    expect(porBeto.body.eleccion).toMatchObject({ estado: 'charla_hecha', cargadaPor: { id: lider } });

    // En la bandeja, abiertas; el Pastor ve el detalle sin las notas.
    const bandeja = (await como(adminId, ADMIN, 'get', '/solicitudes?tipo=eleccion_ministerio&filtro=abiertas&take=100')).body.items as SolicitudBandeja[];
    const fila = bandeja.find((f) => f.persona.id === ana);
    expect(fila).toMatchObject({ abierta: true, estado: 'charla_hecha', extra: { opciones: expect.arrayContaining([expect.stringContaining('Consolidadores')]) } });
    const id = fila!.id;
    const comoPastor = await como(pastorId, PASTOR, 'get', `/elecciones-ministerio/${id}`);
    expect(comoPastor.status).toBe(200);
    expect(JSON.stringify(comoPastor.body)).not.toContain('NOTA-PRIVADA');
    expect((await como(adminId, ADMIN, 'get', `/elecciones-ministerio/${id}`)).body.notas).toBe('Muy servicial, NOTA-PRIVADA');
    expect((await como(pastorId, PASTOR, 'post', `/elecciones-ministerio/${id}/opciones/x/confirmar`, {})).status).toBe(403);
  });

  it('⭐ el Admin confirma área por área: requiere apta, la segunda pide sumar o reemplazar (D241), el paralelo va directo', async () => {
    const id = (await prisma.eleccionMinisterio.findFirstOrThrow({ where: { personaId: ana, grupoId: g }, select: { id: true } })).id;
    const detalle = (await como(adminId, ADMIN, 'get', `/elecciones-ministerio/${id}`)).body as DetalleEleccionAdmin;
    expect(detalle.apta).toBe(false);
    const op = (nombre: string) => detalle.opciones.find((o) => o.celula.nombre === nombre)!.id;
    const confirmar = (opcionId: string, cuerpo: object = {}) => como(adminId, ADMIN, 'post', `/elecciones-ministerio/${id}/opciones/${opcionId}/confirmar`, cuerpo);
    expect((await confirmar(op('Consolidadores'))).body.code).toBe('NO_APTA_PARA_MINISTERIO');

    // Terminó Vida de Servicio (spec 008 le da el rol de estado).
    await prisma.persona.update({ where: { id: ana }, data: { rol: { push: 'apto_ministerio' } } });
    expect((await confirmar(op('Consolidadores'))).status).toBe(200);
    const segunda = await confirmar(op('Fotografía'));
    expect([segunda.status, segunda.body.code, segunda.body.puedeSumar]).toEqual([409, 'POSTULACION_REQUIERE_CONFIRMAR_CAMBIO', true]);
    expect((await confirmar(op('Fotografía'), { sumar: true })).status).toBe(200);
    const ultima = await confirmar(op('Discipulados Vida Nueva'));
    expect([ultima.status, ultima.body.estado]).toEqual([200, 'resuelta']);
    expect((await confirmar(op('Consolidadores'))).body.code).toBe('ELECCION_CERRADA');

    const miCamino = (await como(ana, [...MIEMBRO, 'apto_ministerio'], 'get', '/ministerios/me')).body as EstadoMiMinisterio;
    expect(miCamino.estado).toBe('miembro');
    if (miCamino.estado !== 'miembro') return;
    expect(miCamino.membresias.map((m) => m.celula?.nombre)).toEqual(['Consolidadores', 'Fotografía', 'Discipulados Vida Nueva']);
    const opciones = await prisma.opcionEleccionMinisterio.findMany({ where: { eleccionId: id }, select: { resultado: true, postulacionId: true } });
    expect(opciones.every((o) => o.resultado === 'confirmada' && o.postulacionId)).toBe(true);
  });

  it('"No por ahora" con motivo interno; dar de baja de Vida de Servicio cancela una elección sin resolver', async () => {
    const id = (await prisma.eleccionMinisterio.findFirstOrThrow({ where: { personaId: beto, grupoId: g }, select: { id: true } })).id;
    const detalle = (await como(adminId, ADMIN, 'get', `/elecciones-ministerio/${id}`)).body as DetalleEleccionAdmin;
    const r = await como(adminId, ADMIN, 'post', `/elecciones-ministerio/${id}/opciones/${detalle.opciones[0].id}/descartar`, { motivo: 'Por ahora no hay lugar' });
    expect(r.body).toMatchObject({ estado: 'resuelta', opciones: [{ resultado: 'descartada', motivoDescarte: 'Por ahora no hay lugar' }] });

    expect((await como(caro, MIEMBRO, 'put', '/elecciones-ministerio/me', { opciones: opcion('Informes') })).status).toBe(200);
    const inscripcion = await prisma.inscripcion.findFirstOrThrow({ where: { personaId: caro, grupoId: g }, select: { id: true } });
    expect((await como(adminId, ADMIN, 'post', `/grupos/vida-de-servicio/${g}/inscripciones/${inscripcion.id}/baja`, { tipo: 'dada_de_baja' })).status).toBe(200);
    expect((await prisma.eleccionMinisterio.findFirstOrThrow({ where: { personaId: caro, grupoId: g }, select: { estado: true } })).estado).toBe('cancelada');
  });
});
