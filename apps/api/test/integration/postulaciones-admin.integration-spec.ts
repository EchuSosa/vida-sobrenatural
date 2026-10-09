import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import type {
  EstadoMiMinisterio,
  MinisterioDePersona,
  PostulacionDetalle,
  SolicitudBandeja,
} from '@vida-sobrenatural/shared-types';
import type { PrismaService } from '../../src/prisma/prisma.service.js';
import { NotificacionesService } from '../../src/notificaciones/notificaciones.service.js';
import { RegistroPendientesAdmin } from '../../src/bandeja/registro-pendientes.js';
import { Escenario, levantarApp, tokenDe } from './discipulado-fixtures.js';
import { nacidoHace, registrarAvisos } from './camino-fixtures.js';
import { ADMIN, APTA, Ministerios, PASTOR } from './ministerios-fixtures.js';

/**
 * spec 009, T024 (fuente), T026, T049, T053 (FR-015 a FR-025, FR-041,
 * SC-003): el Admin revisa contra la base — aprobar con y sin cambio de
 * Ministerio, la carrera de dos aprobaciones, rechazar, en nombre de, dar de
 * baja, el rol discipulador de docs/22 y lo que ve el Pastor.
 */
describe('Postulaciones del Admin (spec 009, T026/T049/T053)', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;
  let esc: Escenario;
  let mins: Ministerios;
  let avisos: ReturnType<typeof registrarAvisos>;
  const personas: string[] = [];
  const sufijo = `padm-${Date.now()}`;
  let adminId: string;
  let pastorId: string;
  let bienvenida: Awaited<ReturnType<Ministerios['ministerio']>>;
  let ensenanza: Awaited<ReturnType<Ministerios['ministerio']>>;

  async function persona(
    clave: string,
    opciones: { rol?: string[]; fechaNacimiento?: Date } = {},
  ) {
    const id = await esc.persona(clave, {
      rol: opciones.rol ?? APTA,
      fechaNacimiento: opciones.fechaNacimiento,
    });
    personas.push(id);
    return id;
  }

  async function como(
    personaId: string,
    rol: string[],
    metodo: 'get' | 'post',
    ruta: string,
    cuerpo?: object,
  ) {
    const req = request(app.getHttpServer())
      [metodo](ruta)
      .set('Authorization', `Bearer ${await tokenDe(personaId, rol)}`);
    return cuerpo ? req.send(cuerpo) : req;
  }
  const admin = (metodo: 'get' | 'post', ruta: string, cuerpo?: object) =>
    como(adminId, ADMIN, metodo, ruta, cuerpo);

  async function pendiente(
    personaId: string,
    ministerioId: string,
    celulaId?: string,
  ) {
    const res = await como(
      personaId,
      APTA,
      'post',
      `/ministerios/${ministerioId}/postulaciones/me`,
      { celulaId: celulaId ?? null, motivacion: 'Quiero servir' },
    );
    expect(res.status).toBe(201);
    return (res.body as Extract<EstadoMiMinisterio, { estado: 'pendiente' }>)
      .pendiente.postulacionId;
  }

  beforeAll(async () => {
    ({ app, prisma } = await levantarApp());
    avisos = registrarAvisos(app.get(NotificacionesService));
    esc = new Escenario(prisma, sufijo);
    await esc.preparar();
    mins = new Ministerios(prisma, sufijo);
    adminId = await persona('admin', { rol: ADMIN });
    pastorId = await persona('pastor', { rol: PASTOR });
    bienvenida = await mins.ministerio('Bienvenida', {
      celulas: ['Seguridad'],
    });
    ensenanza = await mins.ministerio('Enseñanza', {
      requiereFormacion: true,
      celulas: [
        { nombre: 'Discipulados Vida Nueva', ofreceRolDiscipulador: true },
      ],
    });
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

  it('aprobar sin membresía: aprobada con quién y cuándo, rol miembro_ministerio sin borrar otros roles, aviso a la Persona (FR-018, FR-022)', async () => {
    const id = await persona('aprueba', { rol: [...APTA, 'discipulador'] });
    const pid = await pendiente(
      id,
      bienvenida.id,
      bienvenida.celulas.Seguridad,
    );
    avisos.emitidos.length = 0;
    const res = await admin('post', `/postulaciones/${pid}/aprobar`, {});
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      estado: 'aprobada',
      revisadoPor: { id: adminId },
      ministerioActual: null,
      celula: { nombre: 'Seguridad' },
    });
    const rol = (
      await prisma.persona.findUniqueOrThrow({
        where: { id },
        select: { rol: true },
      })
    ).rol;
    expect(rol).toEqual(
      expect.arrayContaining([
        'discipulador',
        'apto_ministerio',
        'miembro_ministerio',
      ]),
    );
    expect(avisos.emitidos).toEqual([
      {
        nombre: 'ministerio.postulacion_aprobada',
        a: { tipo: 'persona', personaId: id },
        datos: {
          postulacionId: pid,
          ministerioId: bienvenida.id,
          ministerio: bienvenida.nombre,
          celulaId: bienvenida.celulas.Seguridad,
          reemplazaA: null,
        },
      },
    ]);
    // El aviso a la Persona quedó en la base, en la misma transacción (D197).
    expect(
      await prisma.notificacion.count({
        where: { entidadTipo: 'postulacion', entidadId: pid },
      }),
    ).toBe(1);
  });

  it('cambio de Ministerio: sin confirmar → 409 con ministerioActual; confirmando → la vieja inactiva por cambio, la nueva aprobada (FR-017, D173)', async () => {
    const id = await persona('cambia');
    const vieja = await pendiente(id, bienvenida.id);
    await admin('post', `/postulaciones/${vieja}/aprobar`, {});
    const nueva = await pendiente(id, ensenanza.id);

    const detalle = (await admin('get', `/postulaciones/${nueva}`))
      .body as PostulacionDetalle;
    expect(detalle).toMatchObject({
      ministerioActual: { id: bienvenida.id, nombre: bienvenida.nombre },
      requiereFormacion: true,
    });
    expect(detalle.historial.map((h) => h.estado)).toEqual(['aprobada']);

    const sin = await admin('post', `/postulaciones/${nueva}/aprobar`, {});
    expect([sin.status, sin.body.code, sin.body.ministerioActual]).toEqual([
      409,
      'POSTULACION_REQUIERE_CONFIRMAR_CAMBIO',
      { id: bienvenida.id, nombre: bienvenida.nombre },
    ]);
    avisos.emitidos.length = 0;
    const con = await admin('post', `/postulaciones/${nueva}/aprobar`, {
      confirmarCambio: true,
    });
    expect(con.status).toBe(200);
    expect(
      await prisma.postulacion.findUniqueOrThrow({ where: { id: vieja } }),
    ).toMatchObject({
      estado: 'inactiva',
      motivoInactivacion: 'cambio_de_ministerio',
      reemplazadaPorId: nueva,
      inactivadaPorId: adminId,
    });
    expect(
      avisos.emitidos.map((e) => [
        e.nombre,
        (e.datos as { reemplazaA: string | null }).reemplazaA,
      ]),
    ).toEqual([['ministerio.postulacion_aprobada', vieja]]);
    expect((await como(id, APTA, 'get', '/ministerios/me')).body).toMatchObject(
      { estado: 'miembro', membresia: { ministerio: { id: ensenanza.id } } },
    );
  });

  it('SC-003: la misma aprobada dos veces a la vez, y aprobada mientras otro la rechaza → un solo resultado, el otro 409, nunca 500', async () => {
    const id = await persona('carrera');
    const pid = await pendiente(id, bienvenida.id);
    const [a, b] = await Promise.all([
      admin('post', `/postulaciones/${pid}/aprobar`, {}),
      admin('post', `/postulaciones/${pid}/aprobar`, {}),
    ]);
    expect([a.status, b.status].sort((x, y) => x - y)).toEqual([200, 409]);
    expect(
      await prisma.postulacion.count({
        where: { personaId: id, estado: 'aprobada' },
      }),
    ).toBe(1);

    const otra = await persona('carrera-2');
    const p2 = await pendiente(otra, bienvenida.id);
    const [c, d] = await Promise.all([
      admin('post', `/postulaciones/${p2}/aprobar`, {}),
      admin('post', `/postulaciones/${p2}/rechazar`, { motivo: 'x' }),
    ]);
    expect([c.status, d.status].sort((x, y) => x - y)).toEqual([200, 409]);
    expect([c.body.code, d.body.code].filter(Boolean)).toEqual([
      'POSTULACION_NO_PENDIENTE',
    ]);
  });

  it('Ministerio o Célula inactivos → no se aprueba (FR-021)', async () => {
    const id = await persona('inactivo');
    const pausado = await mins.ministerio('Pausado', { celulas: ['Área'] });
    const pid = await pendiente(id, pausado.id, pausado.celulas['Área']);
    await prisma.celula.update({
      where: { id: pausado.celulas['Área'] },
      data: { activo: false },
    });
    expect(
      (await admin('post', `/postulaciones/${pid}/aprobar`, {})).body.errors,
    ).toEqual([{ campo: 'celulaId', code: 'CELULA_NO_DISPONIBLE' }]);
    await prisma.ministerio.update({
      where: { id: pausado.id },
      data: { activo: false },
    });
    const res = await admin('post', `/postulaciones/${pid}/aprobar`, {});
    expect([res.status, res.body.code]).toEqual([
      409,
      'MINISTERIO_NO_DISPONIBLE',
    ]);
    expect(
      (await prisma.postulacion.findUniqueOrThrow({ where: { id: pid } }))
        .estado,
    ).toBe('pendiente');
  });

  it('rechazar con motivo: interno — el Admin lo ve, el Pastor y la Persona no (FR-014, FR-019, FR-023)', async () => {
    const id = await persona('rechazo');
    const pid = await pendiente(id, bienvenida.id);
    const res = await admin('post', `/postulaciones/${pid}/rechazar`, {
      motivo: '  Hoy el equipo está completo  ',
    });
    expect(res.body).toMatchObject({
      estado: 'rechazada',
      motivoRechazo: 'Hoy el equipo está completo',
    });
    expect(
      (await admin('post', `/postulaciones/${pid}/rechazar`, {})).body.code,
    ).toBe('POSTULACION_NO_PENDIENTE');
    expect(
      (
        await admin('post', `/postulaciones/${pid}/rechazar`, {
          motivo: 'a'.repeat(501),
        })
      ).status,
    ).toBe(400);
    const delPastor = (
      await como(pastorId, PASTOR, 'get', `/postulaciones/${pid}`)
    ).body as PostulacionDetalle;
    expect(delPastor.estado).toBe('rechazada');
    expect('motivoRechazo' in delPastor).toBe(false);
    expect(
      JSON.stringify((await como(id, APTA, 'get', '/ministerios/me')).body),
    ).not.toContain('completo');
  });

  it('el Pastor no aprueba, ni rechaza, ni postula en nombre de, ni da de baja (FR-023)', async () => {
    const id = await persona('pastor-intenta');
    const pid = await pendiente(id, bienvenida.id);
    for (const ruta of [
      `/postulaciones/${pid}/aprobar`,
      `/postulaciones/${pid}/rechazar`,
      `/postulaciones/${pid}/dar-de-baja`,
      '/postulaciones',
    ]) {
      expect(
        (
          await como(pastorId, PASTOR, 'post', ruta, {
            personaId: id,
            ministerioId: bienvenida.id,
          })
        ).status,
      ).toBe(403);
    }
  });

  it('en nombre de (FR-024): creadoPorId del Admin, mismas reglas, y la Persona la ve como propia', async () => {
    const id = await persona('en-nombre');
    const res = await admin('post', '/postulaciones', {
      personaId: id,
      ministerioId: bienvenida.id,
      celulaId: bienvenida.celulas.Seguridad,
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      estado: 'pendiente',
      creadoPor: { id: adminId },
      persona: { id },
    });
    expect(avisos.emitidos.at(-1)).toMatchObject({
      nombre: 'ministerio.postulacion_creada',
      datos: { enNombreDe: true },
    });
    expect((await como(id, APTA, 'get', '/ministerios/me')).body).toMatchObject(
      { estado: 'pendiente' },
    );
    const noApta = await persona('en-nombre-no-apta', {
      rol: ['miembro_registrado'],
    });
    expect(
      (
        await admin('post', '/postulaciones', {
          personaId: noApta,
          ministerioId: bienvenida.id,
        })
      ).body.code,
    ).toBe('NO_APTA_PARA_MINISTERIO');
  });

  it('dar de baja (FR-025): inactiva por baja con motivo interno; puede volver a postularse; deja de contar como miembro; el rol queda', async () => {
    const id = await persona('baja');
    const pid = await pendiente(id, bienvenida.id);
    await admin('post', `/postulaciones/${pid}/aprobar`, {});
    const otra = await persona('no-miembro');
    const p2 = await pendiente(otra, bienvenida.id);
    expect(
      (await admin('post', `/postulaciones/${p2}/dar-de-baja`, {})).body.code,
    ).toBe('POSTULACION_NO_APROBADA');

    avisos.emitidos.length = 0;
    const res = await admin('post', `/postulaciones/${pid}/dar-de-baja`, {
      motivo: 'Se mudó',
    });
    expect(res.body).toEqual({ id: pid, estado: 'inactiva' });
    expect(
      await prisma.postulacion.findUniqueOrThrow({ where: { id: pid } }),
    ).toMatchObject({
      motivoInactivacion: 'baja',
      motivoBaja: 'Se mudó',
      inactivadaPorId: adminId,
    });
    expect(avisos.emitidos.map((e) => e.nombre)).toEqual([
      'ministerio.miembro_dado_de_baja',
    ]);
    const miembros = (
      await admin('get', `/ministerios/${bienvenida.id}/miembros?take=100`)
    ).body as { items: Array<{ postulacionId: string }> };
    expect(miembros.items.some((m) => m.postulacionId === pid)).toBe(false);
    expect(
      (
        await prisma.persona.findUniqueOrThrow({
          where: { id },
          select: { rol: true },
        })
      ).rol,
    ).toContain('miembro_ministerio');
    expect((await como(id, APTA, 'get', '/ministerios/me')).body).toMatchObject(
      { estado: 'puede_postularse', ultimo: { tipo: 'baja' } },
    );
    expect(
      (
        await como(
          id,
          APTA,
          'post',
          `/ministerios/${bienvenida.id}/postulaciones/me`,
          {},
        )
      ).status,
    ).toBe(201);

    const perfil = (await admin('get', `/personas/${id}/ministerio`))
      .body as MinisterioDePersona;
    expect(perfil).toMatchObject({
      persona: { id },
      actual: null,
      pendiente: { ministerio: { id: bienvenida.id } },
    });
    expect(perfil.historial.find((h) => h.id === pid)).toMatchObject({
      estado: 'inactiva',
      motivoInactivacion: 'baja',
      motivo: 'Se mudó',
    });
  });

  it('docs/22: aprobar "Discipulados Vida Nueva" ofrece y otorga el rol discipulador en el mismo paso, con su registro; nunca a un menor', async () => {
    const id = await persona('discipula');
    const pid = await pendiente(
      id,
      ensenanza.id,
      ensenanza.celulas['Discipulados Vida Nueva'],
    );
    expect((await admin('get', `/postulaciones/${pid}`)).body).toMatchObject({
      ofrecerRolDiscipulador: true,
    });
    const res = await admin('post', `/postulaciones/${pid}/aprobar`, {
      otorgarRolDiscipulador: true,
    });
    expect(res.body).toMatchObject({
      estado: 'aprobada',
      persona: { esDiscipulador: true },
      ofrecerRolDiscipulador: false,
    });
    expect(
      await prisma.cambioDeRol.count({
        where: {
          personaId: id,
          rol: 'discipulador',
          accion: 'otorgado',
          realizadoPorId: adminId,
        },
      }),
    ).toBe(1);

    const menor = await persona('menor', { fechaNacimiento: nacidoHace(16) });
    const p2 = await pendiente(
      menor,
      ensenanza.id,
      ensenanza.celulas['Discipulados Vida Nueva'],
    );
    expect(
      (await admin('get', `/postulaciones/${p2}`)).body.ofrecerRolDiscipulador,
    ).toBe(false);
    const rechazo = await admin('post', `/postulaciones/${p2}/aprobar`, {
      otorgarRolDiscipulador: true,
    });
    expect([rechazo.status, rechazo.body.code]).toEqual([
      409,
      'PERSONA_MENOR_DE_EDAD_NO_PUEDE_TENER_ROL_DE_CARGO',
    ]);
    expect(
      (await prisma.postulacion.findUniqueOrThrow({ where: { id: p2 } }))
        .estado,
    ).toBe('pendiente'); // nada a medias
    expect(
      (await admin('post', `/postulaciones/${p2}/aprobar`, {})).status,
    ).toBe(200);

    const otra = await persona('sin-area');
    const p3 = await pendiente(otra, bienvenida.id);
    expect(
      (
        await admin('post', `/postulaciones/${p3}/aprobar`, {
          otorgarRolDiscipulador: true,
        })
      ).status,
    ).toBe(400);
  });

  it('D217: "Discipulados Vida Nueva" se sirve en paralelo — aprobarla no pide confirmar ni saca a la Persona de su Ministerio, y un cambio de Ministerio no la toca', async () => {
    const id = await persona('paralelo');
    const servicio = await pendiente(id, bienvenida.id);
    expect((await admin('post', `/postulaciones/${servicio}/aprobar`, {})).status).toBe(200);

    const disc = await pendiente(id, ensenanza.id, ensenanza.celulas['Discipulados Vida Nueva']);
    expect(await prisma.postulacion.findUniqueOrThrow({ where: { id: disc }, select: { enParalelo: true } })).toEqual({ enParalelo: true });
    expect((await admin('get', `/postulaciones/${disc}`)).body).toMatchObject({ ministerioActual: null });
    const aprobada = await admin('post', `/postulaciones/${disc}/aprobar`, {});
    expect([aprobada.status, aprobada.body.estado]).toEqual([200, 'aprobada']);
    const estados = async () =>
      Object.fromEntries(
        (await prisma.postulacion.findMany({ where: { personaId: id }, select: { id: true, estado: true } })).map((p) => [p.id, p.estado]),
      );
    expect(await estados()).toEqual({ [servicio]: 'aprobada', [disc]: 'aprobada' });
    // Mi camino y el Perfil muestran la membresía del Ministerio.
    expect((await como(id, APTA, 'get', '/ministerios/me')).body).toMatchObject({
      estado: 'miembro',
      membresia: { postulacionId: servicio },
    });
    expect(((await admin('get', `/personas/${id}/ministerio`)).body as MinisterioDePersona).actual).toMatchObject({ postulacionId: servicio });
    // Ya sirve en Enseñanza: no se vuelve a postular ahí.
    const otra = await como(id, APTA, 'post', `/ministerios/${ensenanza.id}/postulaciones/me`, { celulaId: ensenanza.celulas['Discipulados Vida Nueva'] });
    expect(otra.body.code).toBe('YA_ES_MIEMBRO_DEL_MINISTERIO');

    // Cambiar de Ministerio reemplaza el del carril principal, nunca el en paralelo.
    const nuevo = await mins.ministerio('Hospitalidad');
    const cambio = await pendiente(id, nuevo.id);
    expect((await admin('get', `/postulaciones/${cambio}`)).body.ministerioActual).toEqual({ id: bienvenida.id, nombre: bienvenida.nombre });
    expect((await admin('post', `/postulaciones/${cambio}/aprobar`, {})).body.code).toBe('POSTULACION_REQUIERE_CONFIRMAR_CAMBIO');
    expect((await admin('post', `/postulaciones/${cambio}/aprobar`, { confirmarCambio: true })).status).toBe(200);
    expect(await estados()).toEqual({ [servicio]: 'inactiva', [disc]: 'aprobada', [cambio]: 'aprobada' });

    // La base sigue garantizando una sola membresía por carril.
    await expect(
      prisma.postulacion.create({ data: { personaId: id, ministerioId: bienvenida.id, estado: 'aprobada', revisadaEn: new Date() } }),
    ).rejects.toThrow();
    await expect(
      prisma.postulacion.create({
        data: { personaId: id, ministerioId: ensenanza.id, estado: 'aprobada', revisadaEn: new Date(), enParalelo: true },
      }),
    ).rejects.toThrow();
  });

  it('bandeja y Pendientes del Inicio (FR-015, FR-041): la fila trae Ministerio, Célula y la marca de formación; el contador cuenta las pendientes', async () => {
    const id = await persona('bandeja');
    const pid = await pendiente(
      id,
      ensenanza.id,
      ensenanza.celulas['Discipulados Vida Nueva'],
    );
    const res = await admin(
      'get',
      `/solicitudes?tipo=postulacion&buscar=${encodeURIComponent(`Test${sufijo}`)}`,
    );
    expect(res.status).toBe(200);
    const fila = (res.body.items as SolicitudBandeja[]).find(
      (s) => s.id === pid,
    );
    expect(fila).toMatchObject({
      tipo: 'postulacion',
      estado: 'pendiente',
      abierta: true,
      persona: { id },
      extra: {
        ministerio: ensenanza.nombre,
        celula: 'Discipulados Vida Nueva',
        requiereFormacion: true,
      },
    });
    const lineas = await app.get(RegistroPendientesAdmin).lineas(new Date());
    const linea = lineas.find((l) => l.clave === 'ministerio_postulaciones');
    expect(linea).toMatchObject({ enlace: '/solicitudes?tipo=postulacion' });
    // Cuenta todas las pendientes de la base: otros tests corren a la vez.
    expect(linea!.cantidad).toBeGreaterThanOrEqual(1);
  });
});
