import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import request from 'supertest';
import sharp from 'sharp';
import type { EventoAviso } from '@vida-sobrenatural/shared-types';
import type { PrismaService } from '../../src/prisma/prisma.service.js';
import { NotificacionesService } from '../../src/notificaciones/notificaciones.service.js';
import { CARPETA_DE_AREA, directorioBase } from '../../src/storage/local-storage.provider.js';
import { registrarAvisos } from './camino-fixtures.js';
import { EN_UN_MES, EscenarioEventos, levantarApp, tokenDe } from './eventos-fixtures.js';

/** spec 011, T028 — FR-009 a FR-014, FR-018, FR-050 (`evento.modificado`). */
describe('Gestión de Eventos (integración)', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;
  let esc: EscenarioEventos;
  let admin: string;
  let pastor: string;
  let avisos: { emitidos: EventoAviso[]; restaurar: () => void };

  const datosMinimos = () => ({
    sedeId: esc.sedeId,
    nombre: 'Noche de alabanza',
    descripcion: 'Una noche para adorar juntos.',
    inicio: EN_UN_MES().toISOString(),
  });

  beforeAll(async () => {
    ({ app, prisma } = await levantarApp());
    esc = new EscenarioEventos(prisma, `gest${Date.now()}`);
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

  const http = () => request(app.getHttpServer());

  it('crea con los datos mínimos: sin inscripción, lugar de la Sede y slug del nombre (FR-010, FR-011)', async () => {
    const res = await http().post('/eventos').set('Authorization', `Bearer ${admin}`).send(datosMinimos());
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      nombre: 'Noche de alabanza',
      tipo: 'general',
      requiereInscripcion: false,
      lugar: 'Calle 7 entre 50 y 51',
      lugarPropio: null,
      estadoInscripcion: 'no_requiere',
      estado: 'publicado',
    });
    expect(res.body.slug).toMatch(/^noche-de-alabanza(-\d+)?$/);
    expect(res.body.creadoPor).toMatchObject({ nombre: 'admin' });
  });

  it('crea con todos los campos (FR-010)', async () => {
    const res = await http()
      .post('/eventos')
      .set('Authorization', `Bearer ${admin}`)
      .send({
        ...datosMinimos(),
        nombre: 'Campamento de jóvenes',
        fin: new Date(EN_UN_MES().getTime() + 2 * 86_400_000).toISOString(),
        lugar: 'Quinta Los Pinos',
        publicoObjetivo: 'Jóvenes de 15 a 25',
        requiereInscripcion: true,
        requiereAprobacion: true,
        cupo: 40,
        permiteListaEspera: true,
        costo: '15000',
        instruccionesPago: 'Alias VIDA.SOBRENATURAL',
        diasAnticipacionRecordatorio: 7,
      });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      lugar: 'Quinta Los Pinos',
      cupo: 40,
      lugaresDisponibles: 40,
      costo: '15000.00',
      requiereAprobacion: true,
      diasAnticipacionRecordatorio: 7,
      estadoInscripcion: 'abierta',
    });
  });

  it('dos Eventos con el mismo nombre no chocan: el segundo lleva sufijo (FR-011)', async () => {
    const a = await http().post('/eventos').set('Authorization', `Bearer ${admin}`).send({ ...datosMinimos(), nombre: `Retiro ${esc.sufijo}` });
    const b = await http().post('/eventos').set('Authorization', `Bearer ${admin}`).send({ ...datosMinimos(), nombre: `Retiro ${esc.sufijo}` });
    expect(b.body.slug).toBe(`${a.body.slug}-2`);
  });

  it('cada error de campo de FR-010 vuelve junto, bajo VALIDACION (H-50)', async () => {
    const res = await http()
      .post('/eventos')
      .set('Authorization', `Bearer ${admin}`)
      .send({
        sedeId: 'no-existe',
        nombre: '',
        descripcion: '',
        requiereInscripcion: false,
        requiereAprobacion: true,
        cupo: 0,
        permiteListaEspera: true,
        costo: '-5',
        diasAnticipacionRecordatorio: 3,
      });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDACION');
    const codigos = res.body.errors.map((e: { campo: string; code: string }) => `${e.campo}:${e.code}`);
    expect(codigos).toEqual(
      expect.arrayContaining([
        'sedeId:SEDE_INVALIDA',
        'nombre:NOMBRE_REQUERIDO',
        'descripcion:DESCRIPCION_REQUERIDA',
        'inicio:INICIO_REQUERIDO',
        'requiereAprobacion:APROBACION_SIN_INSCRIPCION',
        'cupo:CUPO_INVALIDO',
        'costo:COSTO_INVALIDO',
        'instruccionesPago:INSTRUCCIONES_PAGO_REQUERIDAS',
        'diasAnticipacionRecordatorio:DIAS_RECORDATORIO_FUERA_DE_RANGO',
      ]),
    );
  });

  it('fin anterior al inicio → FIN_ANTERIOR_AL_INICIO', async () => {
    const inicio = EN_UN_MES();
    const res = await http()
      .post('/eventos')
      .set('Authorization', `Bearer ${admin}`)
      .send({ ...datosMinimos(), inicio: inicio.toISOString(), fin: new Date(inicio.getTime() - 3_600_000).toISOString() });
    expect(res.body.errors).toEqual([{ campo: 'fin', code: 'FIN_ANTERIOR_AL_INICIO' }]);
  });

  it('renombrar no cambia el slug (FR-011)', async () => {
    const creado = await esc.evento({ nombre: 'Original', slug: `original-${esc.sufijo}` });
    const res = await http().patch(`/eventos/${creado.id}`).set('Authorization', `Bearer ${admin}`).send({ nombre: 'Otro nombre' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ nombre: 'Otro nombre', slug: `original-${esc.sufijo}` });
  });

  describe('FR-014: lo que ya pasó con el Evento manda', () => {
    it('bajar el cupo por debajo de los ocupados → CUPO_MENOR_A_OCUPADOS con los ocupados', async () => {
      const ev = await esc.evento({ cupo: 3 });
      await esc.inscripcion(ev.id, await esc.persona('c1'));
      await esc.inscripcion(ev.id, await esc.persona('c2'), 'pendiente');
      const res = await http().patch(`/eventos/${ev.id}`).set('Authorization', `Bearer ${admin}`).send({ cupo: 1 });
      expect(res.status).toBe(409);
      expect(res.body).toMatchObject({ code: 'CUPO_MENOR_A_OCUPADOS', ocupados: 2 });
    });

    it('apagar la lista con Personas en ella → LISTA_ESPERA_CON_PERSONAS', async () => {
      const ev = await esc.evento({ cupo: 1, permiteListaEspera: true });
      await esc.inscripcion(ev.id, await esc.persona('l1'));
      await esc.inscripcion(ev.id, await esc.persona('l2'), 'lista_espera');
      const res = await http().patch(`/eventos/${ev.id}`).set('Authorization', `Bearer ${admin}`).send({ permiteListaEspera: false });
      expect(res.body.code).toBe('LISTA_ESPERA_CON_PERSONAS');
    });

    it('apagar la inscripción con Inscripciones abiertas → EVENTO_CON_INSCRIPCIONES', async () => {
      const ev = await esc.evento();
      await esc.inscripcion(ev.id, await esc.persona('i1'));
      const res = await http().patch(`/eventos/${ev.id}`).set('Authorization', `Bearer ${admin}`).send({ requiereInscripcion: false });
      expect(res.body.code).toBe('EVENTO_CON_INSCRIPCIONES');
    });

    it('cambiar el costo con Pagos registrados → EVENTO_CON_PAGOS', async () => {
      const ev = await esc.evento({ costo: '1000.00', instruccionesPago: 'Alias' });
      await esc.pago(await esc.inscripcion(ev.id, await esc.persona('p1')));
      const res = await http().patch(`/eventos/${ev.id}`).set('Authorization', `Bearer ${admin}`).send({ costo: '2000' });
      expect(res.body.code).toBe('EVENTO_CON_PAGOS');
      const mismoCosto = await http().patch(`/eventos/${ev.id}`).set('Authorization', `Bearer ${admin}`).send({ costo: '1000.00', nombre: 'Renombrado' });
      expect(mismoCosto.status).toBe(200);
    });

    it('cambiar el tipo con Inscripciones (aunque estén canceladas) → EVENTO_CON_INSCRIPCIONES', async () => {
      const ev = await esc.evento();
      await esc.inscripcion(ev.id, await esc.persona('t1'), 'cancelada');
      const res = await http().patch(`/eventos/${ev.id}`).set('Authorization', `Bearer ${admin}`).send({ tipo: 'bautismo' });
      expect(res.body.code).toBe('EVENTO_CON_INSCRIPCIONES');
    });
  });

  describe('FR-018: subir o quitar el cupo promueve desde la lista, en orden', () => {
    it('subir el cupo en 2 confirma a las dos primeras de la lista y emite su aviso', async () => {
      const ev = await esc.evento({ cupo: 1, permiteListaEspera: true });
      await esc.inscripcion(ev.id, await esc.persona('s0'));
      const t0 = Date.now();
      const primera = await esc.inscripcion(ev.id, await esc.persona('s1'), 'lista_espera', new Date(t0));
      const segunda = await esc.inscripcion(ev.id, await esc.persona('s2'), 'lista_espera', new Date(t0 + 1000));
      const tercera = await esc.inscripcion(ev.id, await esc.persona('s3'), 'lista_espera', new Date(t0 + 2000));
      const res = await http().patch(`/eventos/${ev.id}`).set('Authorization', `Bearer ${admin}`).send({ cupo: 3 });
      expect(res.status).toBe(200);
      const estados = await prisma.inscripcionEvento.findMany({ where: { id: { in: [primera, segunda, tercera] } }, select: { id: true, estado: true, promovidaEn: true } });
      const por = Object.fromEntries(estados.map((e) => [e.id, e]));
      expect(por[primera].estado).toBe('confirmada');
      expect(por[segunda].estado).toBe('confirmada');
      expect(por[primera].promovidaEn).not.toBeNull();
      expect(por[tercera].estado).toBe('lista_espera');
      expect(avisos.emitidos.filter((a) => a.nombre === 'evento.lista_espera_promovida')).toHaveLength(2);
      expect(res.body).toMatchObject({ ocupados: 3, enEspera: 1 });
    });

    it('con aprobación, el promovido pasa a pendiente', async () => {
      const ev = await esc.evento({ cupo: 1, permiteListaEspera: true, requiereAprobacion: true });
      await esc.inscripcion(ev.id, await esc.persona('a0'), 'pendiente');
      const enLista = await esc.inscripcion(ev.id, await esc.persona('a1'), 'lista_espera');
      await http().patch(`/eventos/${ev.id}`).set('Authorization', `Bearer ${admin}`).send({ cupo: 2 });
      expect((await prisma.inscripcionEvento.findUnique({ where: { id: enLista } }))?.estado).toBe('pendiente');
    });

    it('quitar el cupo promueve a toda la lista', async () => {
      const ev = await esc.evento({ cupo: 1, permiteListaEspera: true });
      await esc.inscripcion(ev.id, await esc.persona('q0'));
      await esc.inscripcion(ev.id, await esc.persona('q1'), 'lista_espera');
      await esc.inscripcion(ev.id, await esc.persona('q2'), 'lista_espera');
      const res = await http().patch(`/eventos/${ev.id}`).set('Authorization', `Bearer ${admin}`).send({ cupo: null, permiteListaEspera: false });
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ ocupados: 3, enEspera: 0, cupo: null });
    });
  });

  describe('FR-050: evento.modificado', () => {
    it('cambiar la fecha con inscriptos emite evento.modificado a los inscriptos', async () => {
      const ev = await esc.evento();
      await esc.inscripcion(ev.id, await esc.persona('m1'));
      await http().patch(`/eventos/${ev.id}`).set('Authorization', `Bearer ${admin}`).send({ inicio: new Date(Date.now() + 40 * 86_400_000).toISOString() });
      expect(avisos.emitidos).toEqual([
        expect.objectContaining({ nombre: 'evento.modificado', a: { tipo: 'evento_inscriptos', eventoId: ev.id } }),
      ]);
    });

    it('sin inscriptos, o cambiando solo la descripción, no emite', async () => {
      const sinInscriptos = await esc.evento();
      await http().patch(`/eventos/${sinInscriptos.id}`).set('Authorization', `Bearer ${admin}`).send({ lugar: 'Otro lugar' });
      const conInscriptos = await esc.evento();
      await esc.inscripcion(conInscriptos.id, await esc.persona('m2'));
      await http().patch(`/eventos/${conInscriptos.id}`).set('Authorization', `Bearer ${admin}`).send({ descripcion: 'Nueva descripción' });
      expect(avisos.emitidos).toEqual([]);
    });
  });

  describe('FR-009: el Pastor ve y no gestiona', () => {
    it('lista y ve el detalle', async () => {
      const ev = await esc.evento();
      expect((await http().get('/eventos?filtro=todos').set('Authorization', `Bearer ${pastor}`)).status).toBe(200);
      expect((await http().get(`/eventos/${ev.id}`).set('Authorization', `Bearer ${pastor}`)).status).toBe(200);
    });
    it('recibe 403 en cualquier escritura', async () => {
      const ev = await esc.evento();
      expect((await http().post('/eventos').set('Authorization', `Bearer ${pastor}`).send(datosMinimos())).status).toBe(403);
      expect((await http().patch(`/eventos/${ev.id}`).set('Authorization', `Bearer ${pastor}`).send({ nombre: 'x' })).status).toBe(403);
      expect((await http().post(`/eventos/${ev.id}/cancelar`).set('Authorization', `Bearer ${pastor}`)).status).toBe(403);
      expect((await http().get('/eventos/papelera').set('Authorization', `Bearer ${pastor}`)).status).toBe(403);
    });
    it('sin sesión, 401', async () => {
      expect((await http().get('/eventos')).status).toBe(401);
    });
  });

  describe('GET /eventos — filtros, búsqueda y totales (FR-009)', () => {
    it('próximos, pasados y cancelados; búsqueda por nombre; totales por Evento', async () => {
      const marca = `Busqueda${esc.sufijo}`;
      const proximo = await esc.evento({ nombre: `${marca} próximo`, cupo: 5, costo: '100.00', instruccionesPago: 'Alias' });
      const pasado = await esc.evento({ nombre: `${marca} pasado`, inicio: new Date(Date.now() - 10 * 86_400_000) });
      const cancelado = await esc.evento({ nombre: `${marca} cancelado`, estado: 'cancelado' });
      const insc = await esc.inscripcion(proximo.id, await esc.persona('f1'));
      await esc.inscripcion(proximo.id, await esc.persona('f2'), 'pendiente');
      await esc.pago(insc);

      const ids = async (filtro: string) =>
        (await http().get(`/eventos?filtro=${filtro}&buscar=${marca}`).set('Authorization', `Bearer ${admin}`)).body.items.map((e: { id: string }) => e.id);
      expect(await ids('proximos')).toEqual([proximo.id]);
      expect(await ids('pasados')).toEqual([pasado.id]);
      expect(await ids('cancelados')).toEqual([cancelado.id]);
      expect(await ids('todos')).toHaveLength(3);

      const res = await http().get(`/eventos?filtro=proximos&buscar=${marca.toLowerCase()}`).set('Authorization', `Bearer ${admin}`);
      expect(res.body.total).toBe(1);
      expect(res.body.items[0]).toMatchObject({ ocupados: 2, pendientes: 1, enEspera: 0, pagosAVerificar: 1 });
    });
  });

  describe('Flyer (FR-012)', () => {
    const imagen = (ancho: number, alto: number) =>
      sharp({ create: { width: ancho, height: alto, channels: 3, background: { r: 200, g: 100, b: 50 } } }).png().toBuffer();

    it('sin texto alternativo → error de campo; tipo inválido → FLYER_TIPO_INVALIDO; chico → FLYER_DIMENSION_INSUFICIENTE', async () => {
      const ev = await esc.evento();
      const sinAlt = await http().put(`/eventos/${ev.id}/flyer`).set('Authorization', `Bearer ${admin}`).attach('archivo', await imagen(800, 1000), 'flyer.png');
      expect(sinAlt.body).toMatchObject({ code: 'VALIDACION', errors: [{ campo: 'descripcionImagen', code: 'DESCRIPCION_IMAGEN_REQUERIDA' }] });
      const pdf = await http()
        .put(`/eventos/${ev.id}/flyer`)
        .set('Authorization', `Bearer ${admin}`)
        .field('descripcionImagen', 'Flyer')
        .attach('archivo', Buffer.from('%PDF-1.4'), { filename: 'flyer.pdf', contentType: 'application/pdf' });
      expect(pdf.body.code).toBe('FLYER_TIPO_INVALIDO');
      const chico = await http()
        .put(`/eventos/${ev.id}/flyer`)
        .set('Authorization', `Bearer ${admin}`)
        .field('descripcionImagen', 'Flyer')
        .attach('archivo', await imagen(300, 300), 'chico.png');
      expect(chico.body.code).toBe('FLYER_DIMENSION_INSUFICIENTE');
    });

    it('más de 5 MB → FLYER_TAMANO_EXCEDIDO', async () => {
      const ev = await esc.evento();
      const res = await http()
        .put(`/eventos/${ev.id}/flyer`)
        .set('Authorization', `Bearer ${admin}`)
        .field('descripcionImagen', 'Flyer')
        .attach('archivo', Buffer.alloc(5 * 1024 * 1024 + 1, 1), { filename: 'grande.png', contentType: 'image/png' });
      expect(res.body.code).toBe('FLYER_TAMANO_EXCEDIDO');
    });

    it('subir guarda la URL pública y el alt; reemplazar borra el archivo anterior; quitar limpia todo', async () => {
      const ev = await esc.evento();
      const primero = await http()
        .put(`/eventos/${ev.id}/flyer`)
        .set('Authorization', `Bearer ${admin}`)
        .field('descripcionImagen', 'Campamento, 14 de noviembre')
        .attach('archivo', await imagen(1080, 1350), 'flyer.png');
      expect(primero.status).toBe(200);
      expect(primero.body).toMatchObject({ descripcionImagen: 'Campamento, 14 de noviembre' });
      expect(primero.body.imagenUrl).toContain('/flyers/');
      const rutaVieja = (await prisma.evento.findUnique({ where: { id: ev.id } }))!.imagenRuta!;
      const archivoViejo = join(directorioBase(), CARPETA_DE_AREA.flyers, rutaVieja);
      expect(existsSync(archivoViejo)).toBe(true);

      const segundo = await http()
        .put(`/eventos/${ev.id}/flyer`)
        .set('Authorization', `Bearer ${admin}`)
        .field('descripcionImagen', 'Otro flyer')
        .attach('archivo', await imagen(900, 900), 'otro.png');
      expect(segundo.body.imagenUrl).not.toBe(primero.body.imagenUrl);
      expect(existsSync(archivoViejo)).toBe(false);

      const soloAlt = await http().put(`/eventos/${ev.id}/flyer`).set('Authorization', `Bearer ${admin}`).field('descripcionImagen', 'Alt corregido');
      expect(soloAlt.body).toMatchObject({ imagenUrl: segundo.body.imagenUrl, descripcionImagen: 'Alt corregido' });

      const quitado = await http().delete(`/eventos/${ev.id}/flyer`).set('Authorization', `Bearer ${admin}`);
      expect(quitado.body).toMatchObject({ imagenUrl: null, descripcionImagen: null });
    });
  });
});
