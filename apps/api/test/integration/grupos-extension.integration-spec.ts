import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import type { DatosGrupoExtension, EstadoMiGrupoExtension, GrupoExtensionEncontrado, GrupoLiderado } from '@vida-sobrenatural/shared-types';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import { Escenario, levantarApp, tokenDe } from './discipulado-fixtures.js';

/**
 * spec 014 — Grupos de Extensión de punta a punta contra la base de test, con
 * el geocodificador falso (sin red, D222). Cubre los criterios ⭐ del manual:
 * la persona busca y ve solo lo suyo por cercanía y sin dirección exacta, pide
 * sumarse, el líder recibe el aviso y acepta, y la persona ve su grupo; más
 * permisos, cupo, retiro, rechazo, alta y baja por el Admin, inactivar,
 * el rol `lider_extension` y la concurrencia de aceptar.
 */
describe('Grupos de Extensión (spec 014, integración)', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;
  let escenario: Escenario;
  let tokenAdmin: string;
  let tokenPastor: string;
  const grupos: string[] = [];
  const ADULTA = new Date('1996-03-10'); // 30 años
  const http = () => request(app.getHttpServer());

  /** Mujer de 30 y sus líderes. */
  let lideraId: string; // líder mujer, Grupo "Cerca"
  let lideraLejosId: string;
  let liderVaronId: string;
  let tokenLidera: string;
  let tokenLideraLejos: string;

  let cercaId: string;
  let lejosId: string;
  let varonesId: string;
  let mixtoId: string;
  let mayoresId: string;
  let sinUbicarId: string;

  beforeAll(async () => {
    ({ app, prisma } = await levantarApp());
    const sufijo = `gex${Date.now()}`;
    escenario = new Escenario(prisma, sufijo);
    await escenario.preparar();
    // La Sede de "En la iglesia": el geocodificador falso la ubica por "iglesia".
    await prisma.sede.update({ where: { id: escenario.sedeId }, data: { direccion: 'Calle 7 1210 (iglesia)' } });
    const adminId = await escenario.persona('admin', { rol: ['miembro_registrado', 'admin'] });
    const pastorId = await escenario.persona('pastor', { rol: ['miembro_registrado', 'pastor'] });
    tokenAdmin = await tokenDe(adminId, ['miembro_registrado', 'admin']);
    tokenPastor = await tokenDe(pastorId, ['miembro_registrado', 'pastor']);
    lideraId = await escenario.persona('lidera', { genero: 'femenino', telefono: '221 555-0101' });
    lideraLejosId = await escenario.persona('lideralejos', { genero: 'femenino' });
    liderVaronId = await escenario.persona('lidervaron', { genero: 'masculino' });
    tokenLidera = await tokenDe(lideraId, ['miembro_registrado']);
    tokenLideraLejos = await tokenDe(lideraLejosId, ['miembro_registrado']);

    const base = { dias: ['martes'], horaInicio: '19:00', cupo: null, edadMinima: null, edadMaxima: null, enLaIglesia: false, sedeId: null, numero: null, entreCalle1: null, entreCalle2: null };
    cercaId = await crearGrupo({ ...base, nombre: `Cerca ${sufijo}`, lideres: [lideraId], calle: '64', numero: '820', entreCalle1: '11', entreCalle2: '12', zona: 'Centro' });
    lejosId = await crearGrupo({ ...base, nombre: `Lejos ${sufijo}`, lideres: [lideraLejosId], dias: ['jueves'], calle: '13 b', numero: '400', zona: 'City Bell' });
    varonesId = await crearGrupo({ ...base, nombre: `Varones ${sufijo}`, lideres: [liderVaronId], calle: '7', numero: '1200', zona: 'Centro' });
    mixtoId = await crearGrupo({ ...base, nombre: `Mixto ${sufijo}`, lideres: [lideraLejosId, liderVaronId], enLaIglesia: true, sedeId: escenario.sedeId, calle: null, zona: null });
    mayoresId = await crearGrupo({ ...base, nombre: `Mayores ${sufijo}`, lideres: [lideraLejosId], edadMinima: 60, calle: '7', numero: '1200', zona: 'Centro' });
    sinUbicarId = await crearGrupo({ ...base, nombre: `Sin ubicar ${sufijo}`, lideres: [lideraLejosId], calle: 'Calle que no existe', numero: '1', zona: 'Gonnet' });
  });

  afterAll(async () => {
    const solicitudes = await prisma.solicitudGrupoExtension.findMany({ where: { grupoId: { in: grupos } }, select: { id: true } });
    const avisos = await prisma.notificacion.findMany({ where: { entidadId: { in: solicitudes.map((s) => s.id) } }, select: { id: true } });
    await prisma.entregaNotificacion.deleteMany({ where: { notificacionId: { in: avisos.map((a) => a.id) } } });
    await prisma.notificacion.deleteMany({ where: { id: { in: avisos.map((a) => a.id) } } });
    await prisma.solicitudGrupoExtension.deleteMany({ where: { grupoId: { in: grupos } } });
    await prisma.liderGrupoExtension.deleteMany({ where: { grupoId: { in: grupos } } });
    await prisma.grupoExtension.deleteMany({ where: { id: { in: grupos } } });
    await escenario.limpiar();
    await app.close();
  });

  async function crearGrupo(datos: Record<string, unknown>): Promise<string> {
    const r = await http().post('/grupos-extension').set('Authorization', `Bearer ${tokenAdmin}`).send(datos);
    expect(r.status).toBe(201);
    grupos.push(r.body.id);
    return r.body.id as string;
  }

  async function personaNueva(clave: string, opciones: { genero?: 'femenino' | 'masculino'; fechaNacimiento?: Date } = {}) {
    const id = await escenario.persona(clave, { genero: opciones.genero ?? 'femenino', fechaNacimiento: opciones.fechaNacimiento ?? ADULTA });
    return { id, token: await tokenDe(id, ['miembro_registrado']) };
  }

  const buscar = (token: string, cuerpo: object) => http().post('/grupos-extension/buscar').set('Authorization', `Bearer ${token}`).send(cuerpo);
  const pedir = (token: string, grupoId: string) => http().post(`/grupos-extension/${grupoId}/solicitudes/me`).set('Authorization', `Bearer ${token}`);
  const estado = async (token: string) => (await http().get('/grupos-extension/me').set('Authorization', `Bearer ${token}`)).body as EstadoMiGrupoExtension;
  const delGrupo = (ids: string[]) => (g: { id: string }) => ids.includes(g.id);

  describe('Admin (D220–D222, D225)', () => {
    it('crea con la dirección ubicada, o sin ubicar, y el género sale de los líderes', async () => {
      const cerca = (await http().get(`/grupos-extension/${cercaId}`).set('Authorization', `Bearer ${tokenAdmin}`)).body;
      expect(cerca).toMatchObject({ ubicado: true, genero: 'femenino', direccion: '64 nro 820 e/ 11 y 12', zona: 'Centro' });
      const mixto = (await http().get(`/grupos-extension/${mixtoId}`).set('Authorization', `Bearer ${tokenAdmin}`)).body;
      expect(mixto).toMatchObject({ genero: 'mixto', enLaIglesia: true, calle: null });
      const sinUbicar = (await http().get(`/grupos-extension/${sinUbicarId}`).set('Authorization', `Bearer ${tokenAdmin}`)).body;
      expect(sinUbicar.ubicado).toBe(false);
    });

    it('al líder se le otorga lider_extension, con su CambioDeRol', async () => {
      const persona = await prisma.persona.findUniqueOrThrow({ where: { id: lideraId }, select: { rol: true } });
      expect(persona.rol).toContain('lider_extension');
      expect(await prisma.cambioDeRol.count({ where: { personaId: lideraId, rol: 'lider_extension', accion: 'otorgado' } })).toBe(1);
    });

    it('valida por campo y nunca acepta a un menor como líder (D133)', async () => {
      const menor = await escenario.persona('menorlider', { fechaNacimiento: new Date('2012-01-01') });
      const r = await http()
        .post('/grupos-extension')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ nombre: '', lideres: [menor], dias: [], horaInicio: '19:10', enLaIglesia: false, calle: '', zona: '' });
      expect(r.status).toBe(400);
      const campos = Object.fromEntries((r.body.errors as Array<{ campo: string; code: string }>).map((e) => [e.campo, e.code]));
      expect(campos).toMatchObject({
        nombre: 'NOMBRE_REQUERIDO',
        dias: 'DIAS_REQUERIDOS',
        horaInicio: 'HORA_INVALIDA',
        calle: 'CALLE_REQUERIDA',
        zona: 'ZONA_REQUERIDA',
        lideres: 'LIDER_MENOR_DE_EDAD',
      });
    });

    it('el Pastor ve pero no gestiona; una persona sin cargo no ve el backoffice', async () => {
      expect((await http().get('/grupos-extension').set('Authorization', `Bearer ${tokenPastor}`)).status).toBe(200);
      expect((await http().post('/grupos-extension').set('Authorization', `Bearer ${tokenPastor}`).send({})).status).toBe(403);
      expect((await http().get('/grupos-extension').set('Authorization', `Bearer ${tokenLidera}`)).status).toBe(403);
    });
  });

  describe('Persona: buscar (D223)', () => {
    it('⭐ ve solo los de su género y edad, por cercanía, sin dirección exacta ni contacto', async () => {
      const { token } = await personaNueva('buscadora');
      const r = await buscar(token, { direccion: '7 nro 1200' });
      expect(r.status).toBe(200);
      const encontrados = (r.body as GrupoExtensionEncontrado[]).filter(delGrupo(grupos));
      expect(encontrados.map((g) => g.id)).toEqual([mixtoId, cercaId, lejosId, sinUbicarId]);
      expect(encontrados[0].distanciaKm).toBeLessThan(encontrados[1].distanciaKm!);
      expect(encontrados[3].distanciaKm).toBeNull();
      const texto = JSON.stringify(r.body);
      expect(texto).not.toContain('820');
      expect(texto).not.toContain('calle');
      expect(texto).not.toContain('telefono');
      expect(texto).not.toContain('555');
      expect(encontrados[1]).toMatchObject({ lideres: ['lidera'], zona: 'Centro', dias: ['martes'], horaInicio: '19:00', completo: false });
    });

    it('un varón ve los de varones y el mixto; una mujer de 65 también ve el de mayores', async () => {
      const varon = await personaNueva('buscador', { genero: 'masculino' });
      const ids = ((await buscar(varon.token, { direccion: '7 nro 1200' })).body as GrupoExtensionEncontrado[]).filter(delGrupo(grupos)).map((g) => g.id);
      expect(ids.sort()).toEqual([varonesId, mixtoId].sort());
      const mayor = await personaNueva('mayor', { fechaNacimiento: new Date('1960-01-01') });
      const idsMayor = ((await buscar(mayor.token, { latitud: -34.9214, longitud: -57.9545 })).body as GrupoExtensionEncontrado[]).filter(delGrupo(grupos)).map((g) => g.id);
      expect(idsMayor).toContain(mayoresId);
    });

    it('filtra por días', async () => {
      const { token } = await personaNueva('jueves');
      const ids = ((await buscar(token, { direccion: '7 nro 1200', dias: ['jueves'] })).body as GrupoExtensionEncontrado[]).filter(delGrupo(grupos)).map((g) => g.id);
      expect(ids).toEqual([lejosId]);
    });

    it('dirección que no se ubica → 400 por campo; servicio caído → 503; nada se guarda', async () => {
      const { id, token } = await personaNueva('perdida');
      const antes = await prisma.persona.findUniqueOrThrow({ where: { id }, select: { direccion: true, updatedAt: true } });
      const r = await buscar(token, { direccion: 'calle que no existe 1' });
      expect(r.status).toBe(400);
      expect(r.body.code).toBe('DIRECCION_NO_UBICADA');
      expect(r.body.errors).toEqual([{ campo: 'direccion', code: 'DIRECCION_NO_UBICADA' }]);
      expect((await buscar(token, { direccion: 'sin servicio' })).body.code).toBe('UBICACION_NO_DISPONIBLE');
      expect((await buscar(token, {})).body.errors).toEqual([{ campo: 'direccion', code: 'DIRECCION_REQUERIDA' }]);
      await buscar(token, { direccion: '7 nro 1200' });
      const despues = await prisma.persona.findUniqueOrThrow({ where: { id }, select: { direccion: true, updatedAt: true } });
      expect(despues).toEqual(antes);
    });
  });

  describe('⭐ pedir → el líder acepta → la persona ve su grupo (D224, D225, D227)', () => {
    it('de punta a punta', async () => {
      const { id, token } = await personaNueva('flor');
      const pedido = await pedir(token, cercaId);
      expect(pedido.status).toBe(201);
      const solicitudId = pedido.body.id as string;

      // Una sola pendiente.
      expect((await pedir(token, lejosId)).body.code).toBe('GRUPO_EXTENSION_PEDIDO_PENDIENTE');
      const pendiente = await estado(token);
      expect(pendiente).toMatchObject({ estado: 'pendiente', solicitudId, grupo: { id: cercaId, lideres: ['lidera'] } });

      // El aviso al líder (D227), sin datos personales en los params.
      const aviso = await prisma.entregaNotificacion.findFirst({
        where: { personaId: lideraId, canal: 'app', notificacion: { evento: 'grupo_extension.solicitud_nueva', entidadId: solicitudId } },
        select: { notificacion: { select: { params: true } } },
      });
      expect(aviso?.notificacion.params).toEqual({ solicitudId, grupoId: cercaId, grupo: expect.stringContaining('Cerca') });

      // El líder ve el pedido con el contacto; un líder de otro Grupo no puede resolverlo.
      const liderados = (await http().get('/grupos-extension/liderados').set('Authorization', `Bearer ${tokenLidera}`)).body as GrupoLiderado[];
      const mio = liderados.find((g) => g.id === cercaId)!;
      expect(mio.pendientes).toEqual([expect.objectContaining({ id: solicitudId, persona: expect.objectContaining({ nombre: 'flor', telefono: '+5492211234567', whatsapp: '5492211234567', edad: 30 }) })]);
      expect((await http().post(`/grupos-extension/liderados/solicitudes/${solicitudId}/aceptar`).set('Authorization', `Bearer ${tokenLideraLejos}`)).status).toBe(404);

      const aceptar = await http().post(`/grupos-extension/liderados/solicitudes/${solicitudId}/aceptar`).set('Authorization', `Bearer ${tokenLidera}`);
      expect(aceptar.status).toBe(200);

      const integrante = await estado(token);
      expect(integrante).toMatchObject({
        estado: 'integrante',
        grupo: { id: cercaId, direccion: '64 nro 820 e/ 11 y 12', lideres: [expect.objectContaining({ nombre: 'lidera', whatsapp: '5492215550101' })] },
      });
      expect(await prisma.entregaNotificacion.count({ where: { personaId: id, canal: 'app', notificacion: { evento: 'grupo_extension.solicitud_aceptada' } } })).toBe(1);
      // Y no puede pedir otro.
      expect((await pedir(token, lejosId)).body.code).toBe('GRUPO_EXTENSION_YA_INTEGRANTE');
      // El líder la ve entre sus integrantes.
      const despues = (await http().get('/grupos-extension/liderados').set('Authorization', `Bearer ${tokenLidera}`)).body as GrupoLiderado[];
      expect(despues.find((g) => g.id === cercaId)!.integrantes.map((i) => i.solicitudId)).toContain(solicitudId);
      // El pendiente aparece en la bandeja mientras espera; ya aceptado, no está abierto.
      const bandeja = await http().get(`/solicitudes?tipo=grupo_extension&filtro=todas&persona=${id}`).set('Authorization', `Bearer ${tokenAdmin}`);
      expect(bandeja.status).toBe(200);
      const fila = (bandeja.body.items as Array<{ id: string; abierta: boolean; extra: { grupo: string } }>).find((f) => f.id === solicitudId);
      expect(fila).toMatchObject({ abierta: false, extra: { grupo: expect.stringContaining('Cerca') } });
    });

    it('rechazar con mensaje: aviso amable y vuelve a poder elegir', async () => {
      const { id, token } = await personaNueva('rechazada');
      const solicitudId = (await pedir(token, lejosId)).body.id as string;
      const r = await http().post(`/grupos-extension/liderados/solicitudes/${solicitudId}/rechazar`).set('Authorization', `Bearer ${tokenLideraLejos}`).send({ mensaje: 'Te conviene el de los martes' });
      expect(r.status).toBe(200);
      expect(await estado(token)).toMatchObject({ estado: 'sin_grupo', ultima: { estado: 'rechazada', mensaje: 'Te conviene el de los martes' } });
      expect(await prisma.entregaNotificacion.count({ where: { personaId: id, canal: 'app', notificacion: { evento: 'grupo_extension.solicitud_rechazada' } } })).toBe(1);
      expect((await pedir(token, cercaId)).status).toBe(201);
    });

    it('retirar el propio pedido; uno ajeno es 404', async () => {
      const a = await personaNueva('retira');
      const b = await personaNueva('ajena');
      const solicitudId = (await pedir(a.token, lejosId)).body.id as string;
      expect((await http().post(`/solicitudes-grupo-extension/me/${solicitudId}/retirar`).set('Authorization', `Bearer ${b.token}`)).status).toBe(404);
      expect((await http().post(`/solicitudes-grupo-extension/me/${solicitudId}/retirar`).set('Authorization', `Bearer ${a.token}`)).status).toBe(200);
      expect((await estado(a.token)).estado).toBe('sin_grupo');
    });

    it('no puede pedir uno que no le corresponde', async () => {
      const { token } = await personaNueva('equivocada');
      expect((await pedir(token, varonesId)).body.code).toBe('GRUPO_EXTENSION_NO_COMPATIBLE');
    });

    it('dos aceptaciones a la vez: una sola surte efecto', async () => {
      const { token } = await personaNueva('concurrente');
      const solicitudId = (await pedir(token, lejosId)).body.id as string;
      const [r1, r2] = await Promise.all([
        http().post(`/grupos-extension/liderados/solicitudes/${solicitudId}/aceptar`).set('Authorization', `Bearer ${tokenLideraLejos}`),
        http().post(`/solicitudes-grupo-extension/${solicitudId}/aceptar`).set('Authorization', `Bearer ${tokenAdmin}`),
      ]);
      expect([r1.status, r2.status].sort((a, b) => a - b)).toEqual([200, 409]);
      expect(await prisma.solicitudGrupoExtension.count({ where: { id: solicitudId, estado: 'aceptada' } })).toBe(1);
    });
  });

  describe('Cupo, Admin destraba, inactivar (D226, FR-012, FR-015)', () => {
    let chicoId: string;

    it('un Grupo lleno aparece "Completo" y no se puede pedir ni agregar', async () => {
      chicoId = await crearGrupo({ nombre: `Chico ${Date.now()}`, lideres: [lideraLejosId], dias: ['sabado'], horaInicio: '15:00', cupo: 1, edadMinima: null, edadMaxima: null, enLaIglesia: false, sedeId: null, calle: '528', numero: '1500', entreCalle1: null, entreCalle2: null, zona: 'Tolosa' });
      const primera = await personaNueva('primera');
      const r = await http().post(`/grupos-extension/${chicoId}/integrantes`).set('Authorization', `Bearer ${tokenAdmin}`).send({ personaId: primera.id });
      expect(r.status).toBe(201);
      expect(await estado(primera.token)).toMatchObject({ estado: 'integrante', grupo: { id: chicoId } });

      const segunda = await personaNueva('segunda');
      const encontrado = ((await buscar(segunda.token, { direccion: '7 nro 1200' })).body as GrupoExtensionEncontrado[]).find((g) => g.id === chicoId);
      expect(encontrado?.completo).toBe(true);
      expect((await pedir(segunda.token, chicoId)).body.code).toBe('GRUPO_EXTENSION_COMPLETO');
      expect((await http().post(`/grupos-extension/${chicoId}/integrantes`).set('Authorization', `Bearer ${tokenAdmin}`).send({ personaId: segunda.id })).body.code).toBe('GRUPO_EXTENSION_COMPLETO');
    });

    it('no se inactiva con integrantes; quitar libera, y al inactivar el líder sin otros Grupos pierde el rol', async () => {
      const detalle = (await http().get(`/grupos-extension/${chicoId}`).set('Authorization', `Bearer ${tokenAdmin}`)).body;
      expect(detalle.integrantes).toHaveLength(1);
      expect((await http().post(`/grupos-extension/${chicoId}/inactivar`).set('Authorization', `Bearer ${tokenAdmin}`)).body.code).toBe('GRUPO_EXTENSION_CON_INTEGRANTES');
      const quitar = await http().post(`/grupos-extension/${chicoId}/integrantes/${detalle.integrantes[0].solicitudId}/quitar`).set('Authorization', `Bearer ${tokenAdmin}`);
      expect(quitar.status).toBe(200);
      expect((await http().post(`/grupos-extension/${chicoId}/inactivar`).set('Authorization', `Bearer ${tokenAdmin}`)).status).toBe(200);
      // lideraLejos sigue liderando otros Grupos activos: conserva el rol.
      expect((await prisma.persona.findUniqueOrThrow({ where: { id: lideraLejosId } })).rol).toContain('lider_extension');
    });

    it('sacar a un líder de su único Grupo le quita el rol', async () => {
      const solo = await escenario.persona('liderunico', { genero: 'masculino' });
      const id = await crearGrupo({ nombre: `Único ${Date.now()}`, lideres: [solo], dias: ['lunes'], horaInicio: '18:30', cupo: null, edadMinima: null, edadMaxima: null, enLaIglesia: true, sedeId: escenario.sedeId, calle: null, numero: null, entreCalle1: null, entreCalle2: null, zona: null });
      expect((await prisma.persona.findUniqueOrThrow({ where: { id: solo } })).rol).toContain('lider_extension');
      const datos: DatosGrupoExtension = { nombre: 'Único cambiado', lideres: [liderVaronId], dias: ['lunes'], horaInicio: '18:30', cupo: null, edadMinima: null, edadMaxima: null, enLaIglesia: true, sedeId: escenario.sedeId, calle: null, numero: null, entreCalle1: null, entreCalle2: null, zona: null };
      expect((await http().patch(`/grupos-extension/${id}`).set('Authorization', `Bearer ${tokenAdmin}`).send(datos)).status).toBe(200);
      expect((await prisma.persona.findUniqueOrThrow({ where: { id: solo } })).rol).not.toContain('lider_extension');
      expect(await prisma.cambioDeRol.count({ where: { personaId: solo, rol: 'lider_extension', accion: 'quitado' } })).toBe(1);
    });

    it('el Admin acepta desde la bandeja y ve el detalle', async () => {
      const { token } = await personaNueva('desdebandeja');
      const solicitudId = (await pedir(token, cercaId)).body.id as string;
      const det = await http().get(`/solicitudes-grupo-extension/${solicitudId}`).set('Authorization', `Bearer ${tokenPastor}`);
      expect(det.body).toMatchObject({ estado: 'pendiente', persona: { nombre: 'desdebandeja', edad: 30 }, grupo: { id: cercaId } });
      expect((await http().post(`/solicitudes-grupo-extension/${solicitudId}/aceptar`).set('Authorization', `Bearer ${tokenPastor}`)).status).toBe(403);
      expect((await http().post(`/solicitudes-grupo-extension/${solicitudId}/aceptar`).set('Authorization', `Bearer ${tokenAdmin}`)).status).toBe(200);
      expect((await estado(token)).estado).toBe('integrante');
    });
  });
});
