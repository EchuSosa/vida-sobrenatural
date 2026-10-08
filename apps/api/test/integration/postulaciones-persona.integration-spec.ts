import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import type {
  CaminoDeLaPersona,
  EstadoMiMinisterio,
  MinisterioDetalleParaPersona,
  MinisterioParaPostularse,
  MinisterioPublico,
} from '@vida-sobrenatural/shared-types';
import type { PrismaService } from '../../src/prisma/prisma.service.js';
import { NotificacionesService } from '../../src/notificaciones/notificaciones.service.js';
import { Escenario, levantarApp, tokenDe } from './discipulado-fixtures.js';
import { registrarAvisos } from './camino-fixtures.js';
import { APTA, Ministerios } from './ministerios-fixtures.js';

/**
 * spec 009, T018 + T033 (FR-001 a FR-012, SC-003, SC-004): la Persona se
 * postula, retira y ve su card contra la base; la concurrencia contra el
 * índice `postulaciones_una_pendiente`; y la etapa de Mi camino.
 */
describe('Postulaciones de la Persona (spec 009, T018/T033)', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;
  let esc: Escenario;
  let mins: Ministerios;
  let avisos: ReturnType<typeof registrarAvisos>;
  const personas: string[] = [];
  const sufijo = `post-${Date.now()}`;
  let bienvenida: Awaited<ReturnType<Ministerios['ministerio']>>;
  let adoracion: Awaited<ReturnType<Ministerios['ministerio']>>;
  let inactivo: Awaited<ReturnType<Ministerios['ministerio']>>;

  async function persona(clave: string, rol: string[] = APTA) {
    const id = await esc.persona(clave, { rol });
    personas.push(id);
    return id;
  }

  async function como(
    personaId: string,
    metodo: 'get' | 'post',
    ruta: string,
    cuerpo?: object,
    rol: string[] = APTA,
  ) {
    const req = request(app.getHttpServer())
      [metodo](ruta)
      .set('Authorization', `Bearer ${await tokenDe(personaId, rol)}`);
    return cuerpo ? req.send(cuerpo) : req;
  }

  const postular = (
    personaId: string,
    ministerioId: string,
    cuerpo: object = {},
  ) =>
    como(
      personaId,
      'post',
      `/ministerios/${ministerioId}/postulaciones/me`,
      cuerpo,
    );

  beforeAll(async () => {
    ({ app, prisma } = await levantarApp());
    avisos = registrarAvisos(app.get(NotificacionesService));
    esc = new Escenario(prisma, sufijo);
    await esc.preparar();
    mins = new Ministerios(prisma, sufijo);
    bienvenida = await mins.ministerio('Bienvenida', {
      celulas: ['Seguridad', { nombre: 'Consolidadores', activo: false }],
    });
    adoracion = await mins.ministerio('Adoración', {
      requiereFormacion: true,
      celulas: ['Voces'],
    });
    inactivo = await mins.ministerio('Inactivo', { activo: false });
  });

  afterAll(async () => {
    avisos.restaurar();
    await mins.limpiar(personas);
    await esc.limpiar();
    await app.close();
  });

  beforeEach(() => {
    avisos.emitidos.length = 0;
  });

  it('público y app: /publicos trae solo nombre y línea (docs/22); /me/disponibles el contenido completo; ninguno trae inactivos', async () => {
    const publicos = (
      await request(app.getHttpServer()).get('/ministerios/publicos')
    ).body as MinisterioPublico[];
    const propio = publicos.find((m) => m.id === bienvenida.id);
    expect(propio).toEqual({
      id: bienvenida.id,
      nombre: bienvenida.nombre,
      lineaPublica: 'Línea de Bienvenida',
    });
    expect(publicos.some((m) => m.id === inactivo.id)).toBe(false);

    const id = await persona('lista');
    const disponibles = (await como(id, 'get', '/ministerios/me/disponibles'))
      .body as MinisterioParaPostularse[];
    const b = disponibles.find((m) => m.id === bienvenida.id)!;
    expect(b.celulas.map((c) => c.nombre)).toEqual(['Seguridad']); // la inactiva no se ofrece
    expect(disponibles.some((m) => m.id === inactivo.id)).toBe(false);
    // docs/22: primero "para empezar ya", después los que requieren formación.
    const indices = disponibles.map((m) => m.requiereFormacion);
    expect(indices).toEqual([...indices].sort((a, z) => Number(a) - Number(z)));
    expect(
      (await request(app.getHttpServer()).get('/ministerios/me/disponibles'))
        .status,
    ).toBe(401);
  });

  it('crea una pendiente con Célula, la card la muestra y avisa al Admin; sin Célula también; creadoPorId null', async () => {
    const id = await persona('crea');
    const res = await postular(id, adoracion.id, {
      celulaId: adoracion.celulas.Voces,
      motivacion: '  Canto desde chica  ',
      disponibilidad: '',
    });
    expect(res.status).toBe(201);
    const estado = res.body as EstadoMiMinisterio;
    expect(estado).toMatchObject({
      estado: 'pendiente',
      pendiente: {
        ministerio: { id: adoracion.id },
        celula: { nombre: 'Voces' },
        requiereFormacion: true,
      },
    });
    const fila = await prisma.postulacion.findFirstOrThrow({
      where: { personaId: id },
    });
    expect(fila).toMatchObject({
      estado: 'pendiente',
      motivacion: 'Canto desde chica',
      disponibilidad: null,
      creadoPorId: null,
      requiereFormacion: true,
    });
    expect(avisos.emitidos).toEqual([
      {
        nombre: 'ministerio.postulacion_creada',
        a: { tipo: 'admin' },
        datos: {
          postulacionId: fila.id,
          ministerioId: adoracion.id,
          enNombreDe: false,
        },
      },
    ]);

    const sinCelula = await persona('sin-celula');
    expect(
      (await postular(sinCelula, bienvenida.id, { celulaId: null })).body,
    ).toMatchObject({
      estado: 'pendiente',
      pendiente: { celula: null, requiereFormacion: false },
    });
  });

  it('no apta → 409 NO_APTA_PARA_MINISTERIO; Ministerio inactivo → 409; inexistente → 404', async () => {
    const noApta = await persona('no-apta', ['miembro_registrado']);
    expect((await postular(noApta, bienvenida.id)).body.code).toBe(
      'NO_APTA_PARA_MINISTERIO',
    );
    const id = await persona('inactivo');
    const res = await postular(id, inactivo.id);
    expect([res.status, res.body.code]).toEqual([
      409,
      'MINISTERIO_NO_DISPONIBLE',
    ]);
    expect(
      (await postular(id, '00000000-0000-0000-0000-000000000000')).status,
    ).toBe(404);
  });

  it('Célula de otro Ministerio o inactiva, y textos de 501 → VALIDACION por campo (FR-007)', async () => {
    const id = await persona('campos');
    const res = await postular(id, bienvenida.id, {
      celulaId: adoracion.celulas.Voces,
      motivacion: 'a'.repeat(501),
    });
    expect(res.status).toBe(400);
    expect(res.body.errors).toEqual([
      { campo: 'celulaId', code: 'CELULA_NO_DISPONIBLE' },
      { campo: 'motivacion', code: 'TEXTO_DEMASIADO_LARGO' },
    ]);
    expect(
      (
        await postular(id, bienvenida.id, {
          celulaId: bienvenida.celulas.Consolidadores,
        })
      ).body.errors,
    ).toEqual([{ campo: 'celulaId', code: 'CELULA_NO_DISPONIBLE' }]);
    expect(await prisma.postulacion.count({ where: { personaId: id } })).toBe(
      0,
    );
  });

  it('SC-003: dos POST simultáneos → una sola pendiente y un 409, nunca 500', async () => {
    const id = await persona('carrera');
    const [a, b] = await Promise.all([
      postular(id, bienvenida.id),
      postular(id, adoracion.id),
    ]);
    expect([a.status, b.status].sort((x, y) => x - y)).toEqual([201, 409]);
    expect([a.body.code, b.body.code]).toContain('POSTULACION_YA_PENDIENTE');
    expect(
      await prisma.postulacion.count({
        where: { personaId: id, estado: 'pendiente' },
      }),
    ).toBe(1);
  });

  it('retirar: la propia → retirada; ajena → 404; resuelta → 409; después puede volver a postularse (FR-005, FR-006)', async () => {
    const id = await persona('retira');
    const otra = await persona('ajena');
    await postular(id, bienvenida.id);
    const p = await prisma.postulacion.findFirstOrThrow({
      where: { personaId: id },
    });
    expect(
      (await como(otra, 'post', `/postulaciones/me/${p.id}/retirar`)).status,
    ).toBe(404);
    avisos.emitidos.length = 0;
    const res = await como(id, 'post', `/postulaciones/me/${p.id}/retirar`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      estado: 'puede_postularse',
      ultimo: { tipo: 'retirada', ministerio: { nombre: bienvenida.nombre } },
    });
    expect(avisos.emitidos.map((e) => e.nombre)).toEqual([
      'ministerio.postulacion_retirada',
    ]);
    const otraVez = await como(id, 'post', `/postulaciones/me/${p.id}/retirar`);
    expect([otraVez.status, otraVez.body.code]).toEqual([
      409,
      'POSTULACION_NO_PENDIENTE',
    ]);
    expect((await postular(id, bienvenida.id)).status).toBe(201);
    expect(await prisma.postulacion.count({ where: { personaId: id } })).toBe(
      2,
    ); // SC-004: la retirada sigue ahí
  });

  it('miembro: no se postula al suyo (409) y sí a otro; la card dice miembro con la pendiente; el detalle cuenta la situación', async () => {
    const id = await persona('miembro');
    await prisma.postulacion.create({
      data: {
        personaId: id,
        ministerioId: bienvenida.id,
        celulaId: bienvenida.celulas.Seguridad,
        estado: 'aprobada',
        revisadaEn: new Date(),
      },
    });
    expect((await postular(id, bienvenida.id)).body.code).toBe(
      'YA_ES_MIEMBRO_DEL_MINISTERIO',
    );
    const detalleSuyo = (
      await como(id, 'get', `/ministerios/me/${bienvenida.id}`)
    ).body as MinisterioDetalleParaPersona;
    expect(detalleSuyo.situacion).toBe('ya_es_miembro');

    const res = await postular(id, adoracion.id);
    expect(res.body).toMatchObject({
      estado: 'miembro',
      membresia: {
        ministerio: { id: bienvenida.id },
        celula: { nombre: 'Seguridad' },
      },
      pendiente: { ministerio: { id: adoracion.id } },
    });
    expect(
      (await como(id, 'get', `/ministerios/me/${bienvenida.id}`)).body
        .situacion,
    ).toBe('ya_es_miembro');
    const otro = await mins.ministerio('Tercero');
    expect(
      (await como(id, 'get', `/ministerios/me/${otro.id}`)).body,
    ).toMatchObject({
      situacion: 'tiene_pendiente',
      pendienteA: { nombre: adoracion.nombre },
    });
    expect(
      (await como(id, 'get', `/ministerios/me/${inactivo.id}`)).status,
    ).toBe(404);

    // Mi camino (spec 006): servir en un Ministerio completa la etapa por el sistema.
    const camino = (await como(id, 'get', '/camino/me'))
      .body as CaminoDeLaPersona;
    expect(camino.etapas.find((e) => e.etapa === 'ministerio')).toEqual({
      etapa: 'ministerio',
      estado: 'completada',
      como: 'sistema',
    });
  });

  it('no apta ve su situación en el detalle y la card, y la etapa de Mi camino bloqueada', async () => {
    const id = await persona('detalle-no-apta', ['miembro_registrado']);
    expect(
      (
        await como(id, 'get', `/ministerios/me/${bienvenida.id}`, undefined, [
          'miembro_registrado',
        ])
      ).body.situacion,
    ).toBe('no_apta');
    expect(
      (
        await como(id, 'get', '/ministerios/me', undefined, [
          'miembro_registrado',
        ])
      ).body,
    ).toEqual({ estado: 'no_apta' });
    const camino = (
      await como(id, 'get', '/camino/me', undefined, ['miembro_registrado'])
    ).body as CaminoDeLaPersona;
    expect(camino.etapas.find((e) => e.etapa === 'ministerio')?.estado).toBe(
      'bloqueada',
    );
  });
});
