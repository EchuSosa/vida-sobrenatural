import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import type { Pagina, SolicitudBandeja } from '@vida-sobrenatural/shared-types';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import { RegistroFuentesSolicitudes } from '../../src/bandeja/registro-fuentes.js';
import type { FuenteSolicitudes } from '../../src/bandeja/fuente-solicitudes.js';
import { Escenario, levantarApp, tokenDe } from './discipulado-fixtures.js';

const DIA = 86_400_000;
const hace = (dias: number) => new Date(Date.now() - dias * DIA);

/**
 * spec 013, T022/T023 (contracts/bandeja-api.md): la bandeja unificada contra
 * la base real. Cada caso se aísla con `buscar` por el apellido del escenario
 * (otros specs corren en paralelo sobre la misma base).
 *
 * H1.2 necesita un segundo tipo conectado: se usa la rama `bautismo` que la
 * vista ya tiene (lote 0) con una fuente FALSA registrada solo en esta app de
 * test — o la real, si la 010 ya la conectó. Así el test prueba el mecanismo
 * de FR-007 (mezcla, filtro por tipo, orden entre tipos) sin tocar la vista.
 */
describe('Bandeja unificada (integración, spec 013 T022)', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;
  let escenario: Escenario;
  let paginado: Escenario;
  let admin: string;
  let pastor: string;
  let discipulador: string;
  let apellido: string;
  const p: Record<'uno' | 'dos' | 'tres' | 'prop' | 'apr1' | 'apr2' | 'baut' | 'adminId', string> = {
    uno: '', dos: '', tres: '', prop: '', apr1: '', apr2: '', baut: '', adminId: '',
  };
  const solicitud: Record<'uno' | 'dos' | 'tres' | 'prop' | 'apr1' | 'apr2', string> = { uno: '', dos: '', tres: '', prop: '', apr1: '', apr2: '' };
  let bautismoId = '';
  const fechaPropuesta = hace(2);

  const api = () => request(app.getHttpServer());
  const get = (ruta: string, token = admin) => api().get(ruta).set('Authorization', `Bearer ${token}`);
  const deEsteEscenario = (query = '') => get(`/solicitudes?buscar=${encodeURIComponent(apellido)}${query}`);

  beforeAll(async () => {
    ({ app, prisma } = await levantarApp());
    const sufijo = `bj${Date.now()}`;
    escenario = new Escenario(prisma, sufijo);
    await escenario.preparar();
    apellido = `Test${sufijo}`;
    p.adminId = await escenario.persona('admin', { rol: ['miembro_registrado', 'admin'] });
    const pastorId = await escenario.persona('pastor', { rol: ['miembro_registrado', 'pastor'] });
    const discId = await escenario.persona('disc', { rol: ['miembro_registrado', 'discipulador'] });
    admin = await tokenDe(p.adminId, ['miembro_registrado', 'admin']);
    pastor = await tokenDe(pastorId, ['miembro_registrado', 'pastor']);
    discipulador = await tokenDe(discId, ['miembro_registrado', 'discipulador']);

    // H1.1: 3 pendientes, 1 propuesta (pedida hace mucho, propuesta hace 2 días) y 2 aprobadas.
    for (const clave of ['uno', 'dos', 'tres', 'prop', 'apr1', 'apr2', 'baut'] as const) p[clave] = await escenario.persona(clave);
    const crear = async (personaId: string, data: Record<string, unknown>) =>
      (await prisma.solicitudDiscipulado.create({ data: { personaId, ...data }, select: { id: true } })).id;
    solicitud.uno = await crear(p.uno, { estado: 'pendiente', createdAt: hace(10) });
    // H1.7: cargada en nombre de la Persona.
    solicitud.dos = await crear(p.dos, { estado: 'pendiente', createdAt: hace(6), creadoPorId: p.adminId });
    solicitud.tres = await crear(p.tres, { estado: 'pendiente', createdAt: hace(4) });
    solicitud.prop = await crear(p.prop, { estado: 'propuesta', createdAt: hace(20), revisadoPorId: p.adminId, revisadaEn: fechaPropuesta });
    await prisma.propuestaDiscipulado.create({
      data: { tipo: 'nueva', solicitudId: solicitud.prop, discipuladorId: discId, propuestaPorId: p.adminId, propuestaEn: fechaPropuesta },
    });
    solicitud.apr1 = await crear(p.apr1, { estado: 'aprobada', createdAt: hace(30), revisadoPorId: p.adminId, revisadaEn: hace(25) });
    solicitud.apr2 = await crear(p.apr2, { estado: 'aprobada', createdAt: hace(40), revisadoPorId: p.adminId, revisadaEn: hace(35) });

    // H1.2: un segundo tipo, pedido hace 5 días (queda entre "dos" y "tres" por espera).
    bautismoId = (await prisma.solicitudBautismo.create({ data: { personaId: p.baut, estado: 'pendiente', createdAt: hace(5) }, select: { id: true } })).id;
    const registro = app.get(RegistroFuentesSolicitudes);
    if (!registro.fuente('bautismo')) registro.registrar(fuenteBautismoFalsa(prisma));

    // H1.8: 45 abiertas en otro escenario (otro apellido).
    paginado = new Escenario(prisma, `bjpag${Date.now()}`);
    await paginado.preparar();
    for (let i = 0; i < 45; i++) {
      const id = await paginado.persona(`pag${String(i).padStart(2, '0')}`);
      await prisma.solicitudDiscipulado.create({ data: { personaId: id, estado: 'pendiente', createdAt: hace(60 - i) } });
    }
  });

  afterAll(async () => {
    await prisma.solicitudBautismo.deleteMany({ where: { id: bautismoId } });
    await paginado.limpiar();
    await escenario.limpiar();
    await app.close();
  });

  it('H1.1: por defecto las abiertas, la que más espera arriba; la espera de una propuesta cuenta desde la propuesta', async () => {
    const r = await deEsteEscenario('&tipo=discipulado');
    expect(r.status).toBe(200);
    const pagina = r.body as Pagina<SolicitudBandeja>;
    expect(pagina.total).toBe(4);
    expect(pagina.items.map((s) => s.id)).toEqual([solicitud.uno, solicitud.dos, solicitud.tres, solicitud.prop]);
    for (const s of pagina.items) expect(s).toMatchObject({ tipo: 'discipulado', abierta: true, revisadaEn: s.id === solicitud.prop ? fechaPropuesta.toISOString() : null });
    const prop = pagina.items[3];
    expect(prop.esperaDesde).toBe(fechaPropuesta.toISOString());
    expect(prop.createdAt).not.toBe(prop.esperaDesde);
    expect(prop.extra).toMatchObject({ propuestaVigente: { discipulador: { nombre: 'disc' }, propuestaEn: fechaPropuesta.toISOString() } });
    expect(pagina.items[0].persona).toMatchObject({ id: p.uno, nombre: 'uno', apellido, fotoUrl: null });
  });

  it('H1.7: la cargada en nombre de la Persona dice quién la cargó; la propia, null', async () => {
    const { body } = await deEsteEscenario('&tipo=discipulado');
    const porId = new Map((body as Pagina<SolicitudBandeja>).items.map((s) => [s.id, s]));
    expect(porId.get(solicitud.dos)?.creadoPor).toMatchObject({ id: p.adminId, nombre: 'admin' });
    expect(porId.get(solicitud.uno)?.creadoPor).toBeNull();
  });

  it('H1.5: "resueltas" trae las aprobadas con quién las revisó y cuándo', async () => {
    const { body } = await deEsteEscenario('&filtro=resueltas');
    expect(body.total).toBe(2);
    expect(body.items).toEqual([
      expect.objectContaining({ id: solicitud.apr2, abierta: false, estado: 'aprobada', revisadoPor: expect.objectContaining({ id: p.adminId }), revisadaEn: expect.any(String) }),
      expect.objectContaining({ id: solicitud.apr1, abierta: false, revisadoPor: expect.objectContaining({ id: p.adminId }) }),
    ]);
    expect(new Date(body.items[0].revisadaEn).getTime()).toBeLessThan(new Date(body.items[1].revisadaEn).getTime());
  });

  it('"todas", por Persona, y orden por Persona o por fecha', async () => {
    expect((await deEsteEscenario('&filtro=todas&tipo=discipulado')).body.total).toBe(6);
    const dePersona = await get(`/solicitudes?persona=${p.apr1}&filtro=todas`);
    expect(dePersona.body).toMatchObject({ total: 1, items: [{ id: solicitud.apr1, persona: { id: p.apr1 } }] });

    const porPersona = await deEsteEscenario('&tipo=discipulado&orden=persona');
    expect(porPersona.body.items.map((s: SolicitudBandeja) => s.persona.nombre)).toEqual(['dos', 'prop', 'tres', 'uno']);
    const porFechaDesc = await deEsteEscenario('&tipo=discipulado&orden=fecha&dir=desc');
    expect(porFechaDesc.body.items.map((s: SolicitudBandeja) => s.id)).toEqual([solicitud.tres, solicitud.dos, solicitud.uno, solicitud.prop]);
  });

  it('búsqueda por "nombre apellido"', async () => {
    const { body } = await get(`/solicitudes?buscar=${encodeURIComponent(`tres ${apellido}`)}`);
    expect(body).toMatchObject({ total: 1, items: [{ id: solicitud.tres }] });
  });

  it('H1.2: con dos tipos conectados se mezclan en el orden de espera; el filtro por tipo trae solo ese', async () => {
    const mezcla = await deEsteEscenario();
    expect(mezcla.body.total).toBe(5);
    expect(mezcla.body.items.map((s: SolicitudBandeja) => `${s.tipo}:${s.id}`)).toEqual([
      `discipulado:${solicitud.uno}`,
      `discipulado:${solicitud.dos}`,
      `bautismo:${bautismoId}`,
      `discipulado:${solicitud.tres}`,
      `discipulado:${solicitud.prop}`,
    ]);
    const soloBautismo = await deEsteEscenario('&tipo=bautismo');
    expect(soloBautismo.body).toMatchObject({ total: 1, items: [{ tipo: 'bautismo', id: bautismoId, abierta: true, persona: { id: p.baut } }] });

    const conteo = await get('/solicitudes/conteo-abiertas');
    expect(conteo.status).toBe(200);
    expect(conteo.body.discipulado).toBeGreaterThanOrEqual(4 + 45);
    expect(conteo.body.bautismo).toBeGreaterThanOrEqual(1);
    // Solo tipos conectados: los que no tienen fuente no aparecen.
    const registro = app.get(RegistroFuentesSolicitudes);
    expect(Object.keys(conteo.body).sort()).toEqual([...registro.conectados()].sort());
  });

  it('compatibilidad con la 004: `estado=` sin `tipo` es Discipulado y reemplaza a `filtro`', async () => {
    const propuestas = await deEsteEscenario('&estado=propuesta&filtro=resueltas');
    expect(propuestas.body).toMatchObject({ total: 1, items: [{ id: solicitud.prop, estado: 'propuesta' }] });
    const dos = await deEsteEscenario('&tipo=discipulado&estado=pendiente,aprobada');
    expect(dos.body.total).toBe(5);
  });

  it('H1.8: 45 abiertas se paginan de a 20 desde la API; la última página trae 5', async () => {
    const apellidoPag = (await prisma.persona.findFirstOrThrow({ where: { nombre: 'pag00', apellido: { startsWith: 'Testbjpag' } }, select: { apellido: true } })).apellido;
    const primera = await get(`/solicitudes?buscar=${apellidoPag}`);
    expect(primera.body.total).toBe(45);
    expect(primera.body.items).toHaveLength(20);
    const ultima = await get(`/solicitudes?buscar=${apellidoPag}&skip=40&take=20`);
    expect(ultima.body).toMatchObject({ total: 45 });
    expect(ultima.body.items.map((s: SolicitudBandeja) => s.persona.nombre)).toEqual(['pag40', 'pag41', 'pag42', 'pag43', 'pag44']);
  });

  it('lo inválido es 400 VALIDACION con el error en su campo', async () => {
    const tipo = await get('/solicitudes?tipo=no_existe');
    expect(tipo.status).toBe(400);
    expect(tipo.body).toMatchObject({ code: 'VALIDACION', errors: [{ campo: 'tipo', code: 'TIPO_INVALIDO' }] });
    const estado = await get('/solicitudes?tipo=discipulado&estado=lista_espera');
    expect(estado.status).toBe(400);
    expect(estado.body.errors).toEqual([{ campo: 'estado', code: 'ESTADO_INVALIDO' }]);
    const estadoDeOtroTipo = await get('/solicitudes?estado=verificado');
    expect(estadoDeOtroTipo.body.errors).toEqual([{ campo: 'estado', code: 'ESTADO_INVALIDO' }]);
    const take = await get('/solicitudes?take=101');
    expect(take.status).toBe(400);
    expect(take.body.errors).toEqual([{ campo: 'take', code: 'TAKE_INVALIDO' }]);
    expect((await get('/solicitudes?filtro=pendientes')).body.errors).toEqual([{ campo: 'filtro', code: 'FILTRO_INVALIDO' }]);
  });

  it('H1.6: el Pastor lee la bandeja y el conteo; un Discipulador no', async () => {
    expect((await get(`/solicitudes?buscar=${apellido}`, pastor)).status).toBe(200);
    expect((await get('/solicitudes/conteo-abiertas', pastor)).status).toBe(200);
    const sinPermiso = await get('/solicitudes', discipulador);
    expect(sinPermiso.status).toBe(403);
    expect(sinPermiso.body.code).toBe('SIN_PERMISO');
    expect((await get('/solicitudes/conteo-abiertas', discipulador)).status).toBe(403);
  });
});

/** La fuente de un tipo de prueba: solo lo que la bandeja necesita para hidratar una fila. */
function fuenteBautismoFalsa(prisma: PrismaService): FuenteSolicitudes {
  return {
    tipo: 'bautismo',
    async resumenes(ids) {
      const filas = await prisma.solicitudBautismo.findMany({
        where: { id: { in: [...ids] } },
        select: { id: true, estado: true, createdAt: true, persona: { select: { id: true, nombre: true, apellido: true, fotoUrl: true } } },
      });
      const porId = new Map(filas.map((f) => [f.id, f]));
      return ids.flatMap((id) => {
        const f = porId.get(id);
        if (!f) return [];
        const createdAt = f.createdAt.toISOString();
        return [{ tipo: 'bautismo' as const, id, persona: f.persona, estado: f.estado, abierta: f.estado === 'pendiente', createdAt, esperaDesde: createdAt, creadoPor: null, revisadoPor: null, revisadaEn: null }];
      });
    },
  };
}
