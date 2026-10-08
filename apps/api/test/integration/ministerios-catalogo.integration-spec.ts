import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import type {
  EliminadoEnPapelera,
  MinisterioCatalogo,
  MinisterioDetalleCatalogo,
} from '@vida-sobrenatural/shared-types';
import type { PrismaService } from '../../src/prisma/prisma.service.js';
import { Escenario, levantarApp, tokenDe } from './discipulado-fixtures.js';
import { ADMIN, APTA, Ministerios, PASTOR } from './ministerios-fixtures.js';

/**
 * spec 009, T040 (FR-026 a FR-031, FR-034; SC-004, SC-007): el catálogo de
 * Ministerios y Células contra la base — duplicados normalizados, la
 * confirmación por nombre (D38), eliminar y restaurar (D119), y que ninguna
 * fila desaparece en todo el recorrido.
 */
describe('Catálogo de Ministerios y Células (spec 009, T040)', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;
  let esc: Escenario;
  let mins: Ministerios;
  const personas: string[] = [];
  const sufijo = `mcat-${Date.now()}`;
  let adminId: string;
  let pastorId: string;

  const api = () => request(app.getHttpServer());
  async function como(
    personaId: string,
    rol: string[],
    metodo: 'get' | 'post' | 'patch' | 'delete',
    ruta: string,
    cuerpo?: object,
  ) {
    const req = api()
      [metodo](ruta)
      .set('Authorization', `Bearer ${await tokenDe(personaId, rol)}`);
    return cuerpo ? req.send(cuerpo) : req;
  }
  const admin = (
    metodo: 'get' | 'post' | 'patch' | 'delete',
    ruta: string,
    cuerpo?: object,
  ) => como(adminId, ADMIN, metodo, ruta, cuerpo);

  async function crear(
    nombre: string,
    extra: object = {},
  ): Promise<MinisterioCatalogo> {
    const res = await admin('post', '/ministerios', {
      nombre: `${nombre} ${sufijo}`,
      descripcion: `Qué hace ${nombre}.`,
      ...extra,
    });
    expect(res.status).toBe(201);
    mins.registrar(res.body.id);
    return res.body;
  }

  async function filas() {
    const [m, c, p] = await Promise.all([
      prisma.ministerio.count({ where: { nombre: { endsWith: sufijo } } }),
      prisma.celula.count({
        where: { ministerio: { nombre: { endsWith: sufijo } } },
      }),
      prisma.postulacion.count({
        where: { ministerio: { nombre: { endsWith: sufijo } } },
      }),
    ]);
    return m + c + p;
  }

  beforeAll(async () => {
    ({ app, prisma } = await levantarApp());
    esc = new Escenario(prisma, sufijo);
    await esc.preparar();
    mins = new Ministerios(prisma, sufijo);
    adminId = await esc.persona('admin', { rol: ADMIN });
    pastorId = await esc.persona('pastor', { rol: PASTOR });
    personas.push(adminId, pastorId);
  });

  afterAll(async () => {
    await mins.limpiar(personas);
    await esc.limpiar();
    await app.close();
  });

  it('crear: campos por campo (H-50) y nombre único normalizado entre Ministerios; en Células, único dentro de su Ministerio (FR-026, FR-027)', async () => {
    const vacio = await admin('post', '/ministerios', {
      nombre: ' ',
      descripcion: '',
      lineaPublica: 'x'.repeat(141),
    });
    expect(vacio.body.errors).toEqual([
      { campo: 'nombre', code: 'NOMBRE_REQUERIDO' },
      { campo: 'descripcion', code: 'DESCRIPCION_REQUERIDA' },
      { campo: 'lineaPublica', code: 'LINEA_PUBLICA_DEMASIADO_LARGA' },
    ]);
    const m = await crear('Vida en Acción', {
      lineaPublica: 'Servimos a quienes más lo necesitan.',
      requiereFormacion: false,
    });
    expect(m).toMatchObject({
      activo: true,
      celulasActivas: 0,
      miembrosActivos: 0,
      tieneDatosRelacionados: false,
      lineaPublica: 'Servimos a quienes más lo necesitan.',
    });
    const dup = await admin('post', '/ministerios', {
      nombre: ` vida  en ACCION ${sufijo} `,
      descripcion: 'x',
    });
    expect(dup.body.errors).toEqual([
      { campo: 'nombre', code: 'MINISTERIO_NOMBRE_DUPLICADO' },
    ]);

    const otro = await crear('Otro');
    expect(
      (
        await admin('post', `/ministerios/${m.id}/celulas`, {
          nombre: 'Comedor',
          descripcion: 'Almuerzos',
        })
      ).status,
    ).toBe(201);
    expect(
      (
        await admin('post', `/ministerios/${m.id}/celulas`, {
          nombre: 'comedor',
        })
      ).body.errors,
    ).toEqual([{ campo: 'nombre', code: 'CELULA_NOMBRE_DUPLICADO' }]);
    expect(
      (
        await admin('post', `/ministerios/${otro.id}/celulas`, {
          nombre: 'Comedor',
        })
      ).status,
    ).toBe(201);
    expect(
      (
        await admin('patch', `/ministerios/${otro.id}`, {
          nombre: `Vida en Acción ${sufijo}`,
        })
      ).body.errors,
    ).toEqual([{ campo: 'nombre', code: 'MINISTERIO_NOMBRE_DUPLICADO' }]);
  });

  it('inactivar con miembros exige el nombre exacto (409 con conteos), deja las aprobadas intactas, y se revierte (FR-028, SC-007); la Célula no se reactiva con el Ministerio inactivo (FR-029)', async () => {
    const m = await crear('Bienvenida');
    const celula = (
      await admin('post', `/ministerios/${m.id}/celulas`, {
        nombre: 'Seguridad',
      })
    ).body;
    const miembro = await esc.persona('miembro', { rol: APTA });
    personas.push(miembro);
    const aprobada = await prisma.postulacion.create({
      data: {
        personaId: miembro,
        ministerioId: m.id,
        celulaId: celula.id,
        estado: 'aprobada',
        revisadaEn: new Date(),
      },
    });

    const sin = await admin('patch', `/ministerios/${m.id}`, { activo: false });
    expect([
      sin.status,
      sin.body.code,
      sin.body.miembrosActivos,
      sin.body.postulacionesPendientes,
    ]).toEqual([409, 'CONFIRMACION_NOMBRE_REQUERIDA', 1, 0]);
    expect(
      (
        await admin('patch', `/ministerios/${m.id}`, {
          activo: false,
          confirmacionNombre: 'bienvenida',
        })
      ).status,
    ).toBe(409);
    const con = await admin('patch', `/ministerios/${m.id}`, {
      activo: false,
      confirmacionNombre: ` ${m.nombre} `,
    });
    expect(con.body).toMatchObject({ activo: false, miembrosActivos: 1 });
    expect(
      (
        await prisma.postulacion.findUniqueOrThrow({
          where: { id: aprobada.id },
        })
      ).estado,
    ).toBe('aprobada');

    // Pública y app: el inactivo no se ofrece; el listado "todos" lo muestra (FR-031).
    expect(
      (
        (await api().get('/ministerios/publicos')).body as MinisterioCatalogo[]
      ).some((x) => x.id === m.id),
    ).toBe(false);
    const activos = (
      await admin('get', `/ministerios?buscar=${encodeURIComponent(sufijo)}`)
    ).body as MinisterioCatalogo[];
    const todos = (
      await admin(
        'get',
        `/ministerios?estado=todos&buscar=${encodeURIComponent(sufijo)}`,
      )
    ).body as MinisterioCatalogo[];
    expect(activos.some((x) => x.id === m.id)).toBe(false);
    expect(todos.find((x) => x.id === m.id)).toMatchObject({ activo: false });

    // Célula: inactivar con miembros también pide el nombre; con el Ministerio inactivo no se reactiva.
    expect(
      (await admin('patch', `/celulas/${celula.id}`, { activo: false })).body
        .code,
    ).toBe('CONFIRMACION_NOMBRE_REQUERIDA');
    expect(
      (
        await admin('patch', `/celulas/${celula.id}`, {
          activo: false,
          confirmacionNombre: 'Seguridad',
        })
      ).body,
    ).toMatchObject({ activo: false });
    expect(
      (await admin('patch', `/celulas/${celula.id}`, { activo: true })).body
        .code,
    ).toBe('MINISTERIO_INACTIVO');

    expect(
      (await admin('patch', `/ministerios/${m.id}`, { activo: true })).body,
    ).toMatchObject({ activo: true });
    expect(
      (await admin('patch', `/celulas/${celula.id}`, { activo: true })).body,
    ).toMatchObject({ activo: true });
  });

  it('eliminar (D119): bloqueado con Células o Postulaciones; uno vacío va a la papelera y se restaura; una Célula con Postulaciones no; SC-004: ninguna fila desaparece', async () => {
    const antes = await filas();
    const conCelula = await crear('Con Célula');
    const c = (
      await admin('post', `/ministerios/${conCelula.id}/celulas`, {
        nombre: 'Área',
      })
    ).body;
    expect(
      (await admin('get', `/ministerios/${conCelula.id}`)).body,
    ).toMatchObject({
      tieneDatosRelacionados: true,
      celulas: [{ id: c.id, tieneDatosRelacionados: false }],
    });
    expect(
      (await admin('delete', `/ministerios/${conCelula.id}`)).body.code,
    ).toBe('MINISTERIO_TIENE_DATOS_RELACIONADOS');

    const persona = await esc.persona('postulante', { rol: APTA });
    personas.push(persona);
    await prisma.postulacion.create({
      data: {
        personaId: persona,
        ministerioId: conCelula.id,
        celulaId: c.id,
        estado: 'retirada',
        retiradaEn: new Date(),
      },
    });
    expect((await admin('delete', `/celulas/${c.id}`)).body.code).toBe(
      'CELULA_TIENE_DATOS_RELACIONADOS',
    );

    const otraCelula = (
      await admin('post', `/ministerios/${conCelula.id}/celulas`, {
        nombre: 'Vacía',
      })
    ).body;
    expect((await admin('delete', `/celulas/${otraCelula.id}`)).status).toBe(
      204,
    );
    const papeleraCelulas = (
      await admin('get', `/ministerios/${conCelula.id}/celulas/papelera`)
    ).body as EliminadoEnPapelera[];
    expect(papeleraCelulas).toMatchObject([
      { id: otraCelula.id, eliminadoPor: { id: adminId } },
    ]);
    expect(
      (await admin('post', `/celulas/${otraCelula.id}/restaurar`)).body,
    ).toMatchObject({ id: otraCelula.id });

    const vacio = await crear('Vacío');
    expect((await admin('delete', `/ministerios/${vacio.id}`)).status).toBe(
      204,
    );
    expect(
      (
        (
          await admin(
            'get',
            `/ministerios?estado=todos&buscar=${encodeURIComponent(sufijo)}`,
          )
        ).body as MinisterioCatalogo[]
      ).some((x) => x.id === vacio.id),
    ).toBe(false);
    expect((await admin('get', `/ministerios/${vacio.id}`)).status).toBe(404);
    expect(
      (
        (await admin('get', '/ministerios/papelera'))
          .body as EliminadoEnPapelera[]
      ).find((x) => x.id === vacio.id),
    ).toMatchObject({ eliminadoPor: { id: adminId } });
    // Mientras estuvo en la papelera se creó otro con el mismo nombre: no se restaura encima.
    await crear('Vacío');
    expect(
      (await admin('post', `/ministerios/${vacio.id}/restaurar`)).body.errors,
    ).toEqual([{ campo: 'nombre', code: 'MINISTERIO_NOMBRE_DUPLICADO' }]);

    expect(await filas()).toBeGreaterThanOrEqual(antes + 6);
  });

  it('miembros (FR-032): paginados, por apellido, con su Célula y desde cuándo; solo Personas activas', async () => {
    const m = await crear('Con miembros');
    const celula = (
      await admin('post', `/ministerios/${m.id}/celulas`, { nombre: 'Área' })
    ).body;
    const ids: string[] = [];
    for (const clave of ['zeta', 'alfa', 'beta']) {
      const id = await esc.persona(clave, { rol: APTA });
      personas.push(id);
      ids.push(id);
      await prisma.persona.update({
        where: { id },
        data: { apellido: `${clave} Test${sufijo}` },
      });
      await prisma.postulacion.create({
        data: {
          personaId: id,
          ministerioId: m.id,
          celulaId: clave === 'alfa' ? celula.id : null,
          estado: 'aprobada',
          revisadaEn: new Date(),
        },
      });
    }
    await prisma.persona.update({
      where: { id: ids[0] },
      data: { activo: false },
    }); // zeta, inactiva: no cuenta
    const pagina = (await admin('get', `/ministerios/${m.id}/miembros?take=1`))
      .body;
    expect(pagina.total).toBe(2);
    expect(pagina.items).toMatchObject([
      {
        persona: { apellido: `alfa Test${sufijo}` },
        celula: { nombre: 'Área', activo: true },
      },
    ]);
    expect(
      (await admin('get', `/ministerios/${m.id}/miembros?skip=1&take=1`)).body
        .items,
    ).toMatchObject([
      { persona: { apellido: `beta Test${sufijo}` }, celula: null },
    ]);
    expect((await admin('get', `/ministerios/${m.id}`)).body).toMatchObject({
      miembrosActivos: 2,
    } satisfies Partial<MinisterioDetalleCatalogo>);
  });

  it('permisos (FR-023): el Pastor ve el catálogo pero no escribe ni ve la papelera; sin sesión solo /publicos; ?estado=papelera → 400', async () => {
    const m = await crear('Permisos');
    expect(
      (await como(pastorId, PASTOR, 'get', `/ministerios/${m.id}`)).status,
    ).toBe(200);
    expect((await como(pastorId, PASTOR, 'get', '/ministerios')).status).toBe(
      200,
    );
    expect(
      (await como(pastorId, PASTOR, 'get', '/ministerios/papelera')).status,
    ).toBe(403);
    expect(
      (
        await como(pastorId, PASTOR, 'post', '/ministerios', {
          nombre: 'x',
          descripcion: 'y',
        })
      ).status,
    ).toBe(403);
    expect(
      (
        await como(pastorId, PASTOR, 'patch', `/ministerios/${m.id}`, {
          activo: false,
        })
      ).status,
    ).toBe(403);
    expect(
      (await como(pastorId, PASTOR, 'delete', `/ministerios/${m.id}`)).status,
    ).toBe(403);
    expect((await api().get('/ministerios')).status).toBe(401);
    expect((await api().get('/ministerios/publicos')).status).toBe(200);
    expect((await admin('get', '/ministerios?estado=papelera')).status).toBe(
      400,
    );
  });
});
