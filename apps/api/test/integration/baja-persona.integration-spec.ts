import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { Server } from 'node:http';
import { fechasDeServicio, hoyEnArgentina, sumarDias, type ResultadoBaja } from '@vida-sobrenatural/shared-types';
import type { PrismaService } from '../../src/prisma/prisma.service.js';
import { NotificacionesService } from '../../src/notificaciones/notificaciones.service.js';
import { Escenario, levantarApp, tokenDe } from './discipulado-fixtures.js';

/**
 * spec 018 (D261–D264): la baja de la app. Lo central es SC-001: después de la baja, ningún texto de
 * ninguna tabla tiene el nombre, el email, el teléfono, la dirección ni el DNI de la persona.
 */
describe('Baja de la app (spec 018)', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;
  let esc: Escenario;
  let sufijo: string;
  let ministerioId: string;
  let otroMinisterioId: string;
  let eventoId: string;
  const id: Record<string, string> = {};
  const token: Record<string, string> = {};
  // Valores que no comparte ningún otro dato de prueba (el sufijo aparece en sedes, eventos y otras
  // Personas del escenario): si alguno sobrevive a la baja, el barrido de SC-001 lo encuentra.
  const marca = `Qzw${Math.random().toString(36).slice(2, 8)}`;
  const digitos = String(Math.floor(10_000_000 + Math.random() * 89_999_999));
  const datos = () => ({
    nombre: `Anabella${marca}`,
    email: `baja-${marca.toLowerCase()}@example.com`,
    telefono: `+549221${digitos}`,
    direccion: `Calle ${marca} 123`,
    dni: digitos,
  });
  const [domingo] = fechasDeServicio([{ frecuencia: 'semanal', diaSemana: 0 }], 1, sumarDias(hoyEnArgentina(), 1));
  const http = () => request(app.getHttpServer());
  const como = (quien: string) => ({ Authorization: `Bearer ${token[quien]}` });

  /** SC-001: cuántas celdas de texto de toda la base contienen `valor`. */
  async function apariciones(valor: string): Promise<string[]> {
    const columnas = await prisma.$queryRaw<Array<{ tabla: string; columna: string }>>`
      SELECT table_name AS tabla, column_name AS columna FROM information_schema.columns
       WHERE table_schema = 'public' AND data_type IN ('text', 'character varying') AND table_name <> '_prisma_migrations'`;
    const donde: string[] = [];
    for (const { tabla, columna } of columnas) {
      const [fila] = await prisma.$queryRawUnsafe<Array<{ n: bigint }>>(`SELECT count(*) AS n FROM "${tabla}" WHERE "${columna}" ILIKE $1`, `%${valor}%`);
      if (Number(fila.n) > 0) donde.push(`${tabla}.${columna}`);
    }
    return donde;
  }

  beforeAll(async () => {
    ({ app, prisma } = await levantarApp());
    sufijo = `${Date.now()}`;
    esc = new Escenario(prisma, `baja${sufijo}`);
    await esc.preparar();
    const roles: Record<string, string[]> = { admin: ['miembro_registrado', 'admin'], pastor: ['miembro_registrado', 'pastor'], lider: ['miembro_registrado', 'lider_ministerio'] };
    for (const quien of ['admin', 'pastor', 'lider', 'ana', 'beto', 'tutora']) {
      id[quien] = await esc.persona(quien, { rol: roles[quien] ?? ['miembro_registrado'] });
      token[quien] = await tokenDe(id[quien], roles[quien] ?? ['miembro_registrado']);
    }
    const d = datos();
    // Ana tiene de todo: datos propios, un familiar, un comentario, un pedido con texto, una membresía
    // con turno publicado, un liderazgo, y una inscripción a un Evento con respuesta y comprobante.
    await prisma.persona.update({ where: { id: id.ana }, data: { nombre: d.nombre, email: d.email, telefono: d.telefono, direccion: d.direccion, dni: d.dni, rol: ['miembro_registrado', 'lider_ministerio'] } });
    await prisma.relacionFamiliar.create({ data: { personaId: id.ana, familiarId: id.tutora, tipoRelacion: 'tutor' } });
    await prisma.comentarioApp.create({ data: { personaId: id.ana, tipo: 'sugerencia', app: 'web', paginaOrigen: '/inicio', origenHuella: 'x', texto: `Me llamo ${d.nombre}` } });
    await prisma.solicitudBautismo.create({ data: { personaId: id.ana, comentario: `Soy ${d.nombre}, vivo en ${d.direccion}` } });

    ministerioId = (await prisma.ministerio.create({ data: { nombre: `Bienvenida baja ${sufijo}`, descripcion: 'Test' }, select: { id: true } })).id;
    otroMinisterioId = (await prisma.ministerio.create({ data: { nombre: `Ceremonial baja ${sufijo}`, descripcion: 'Test' }, select: { id: true } })).id;
    await prisma.postulacion.create({ data: { personaId: id.ana, ministerioId, estado: 'aprobada', revisadoPorId: id.admin, revisadaEn: new Date(), motivoBaja: null } });
    await prisma.liderMinisterio.create({ data: { ministerioId, personaId: id.lider, asignadoPorId: id.admin } });
    await prisma.liderMinisterio.create({ data: { ministerioId: otroMinisterioId, personaId: id.ana, asignadoPorId: id.admin } });
    const fecha = await prisma.fechaDeServicio.create({ data: { ministerioId, dia: new Date(`${domingo}T00:00:00Z`), estado: 'publicada', publicadaEn: new Date() }, select: { id: true } });
    await prisma.turno.create({ data: { fechaId: fecha.id, personaId: id.ana, asignadoPorId: id.lider, estado: 'cancelado_por_persona', motivoCancelacion: `${d.nombre} viaja` } });
    const fecha2 = await prisma.fechaDeServicio.create({ data: { ministerioId, dia: new Date(`${sumarDias(domingo, 7)}T00:00:00Z`), estado: 'publicada', publicadaEn: new Date() }, select: { id: true } });
    await prisma.turno.create({ data: { fechaId: fecha2.id, personaId: id.ana, asignadoPorId: id.lider } });

    eventoId = (
      await prisma.evento.create({
        data: { sedeId: esc.sedeId, nombre: `Retiro baja ${sufijo}`, slug: `retiro-baja-${sufijo}`, descripcion: 'Test', inicio: new Date(Date.now() + 10 * 86400000), requiereInscripcion: true, creadoPorId: id.admin },
        select: { id: true },
      })
    ).id;
    const pregunta = await prisma.preguntaEvento.create({ data: { eventoId, texto: 'Alergias', tipo: 'texto', orden: 1 }, select: { id: true } });
    const insc = await prisma.inscripcionEvento.create({ data: { personaId: id.ana, eventoId, estado: 'confirmada' }, select: { id: true } });
    await prisma.respuestaPreguntaEvento.create({ data: { inscripcionId: insc.id, preguntaId: pregunta.id, valor: `${d.nombre} es celíaca` } });
    await prisma.pago.create({ data: { inscripcionEventoId: insc.id, monto: 100, medio: 'efectivo', fechaPago: new Date(), estado: 'pendiente_verificacion', comprobanteRuta: `no-existe-${sufijo}.pdf`, comprobanteMime: 'application/pdf' } });
  });

  afterAll(async () => {
    const ministerios = [ministerioId, otroMinisterioId].filter(Boolean);
    await prisma.entregaNotificacion.deleteMany({ where: { personaId: { in: Object.values(id) } } });
    await prisma.turno.deleteMany({ where: { fecha: { ministerioId: { in: ministerios } } } });
    await prisma.fechaDeServicio.deleteMany({ where: { ministerioId: { in: ministerios } } });
    await prisma.liderMinisterio.deleteMany({ where: { ministerioId: { in: ministerios } } });
    await prisma.postulacion.deleteMany({ where: { ministerioId: { in: ministerios } } });
    await prisma.ministerio.deleteMany({ where: { id: { in: ministerios } } });
    await prisma.pago.deleteMany({ where: { inscripcionEvento: { eventoId } } });
    await prisma.inscripcionEvento.deleteMany({ where: { eventoId } });
    await prisma.preguntaEvento.deleteMany({ where: { eventoId } });
    if (eventoId) await prisma.evento.delete({ where: { id: eventoId } });
    await prisma.comentarioApp.deleteMany({ where: { personaId: { in: Object.values(id) } } });
    await prisma.solicitudBautismo.deleteMany({ where: { personaId: { in: Object.values(id) } } });
    await prisma.archivoPendienteDeBorrar.deleteMany({ where: { ruta: { contains: sufijo } } });
    await esc.limpiar();
    await app.close();
  });

  it('pide la palabra BAJA (error en el campo) y el Pastor no puede dar de baja a nadie', async () => {
    const mal = await http().post(`/personas/${id.ana}/baja`).set(como('admin')).send({ confirmacion: 'baj' });
    expect([mal.status, mal.body.errors]).toEqual([400, [{ campo: 'confirmacion', code: 'CONFIRMACION_BAJA_INVALIDA' }]]);
    expect((await http().post(`/personas/${id.ana}/baja`).set(como('pastor')).send({ confirmacion: 'BAJA' })).status).toBe(403);
    expect(await apariciones(datos().nombre)).not.toEqual([]);
  });

  it('SC-004: si algo falla en el medio, no se borra nada (todo o nada)', async () => {
    // Sin `jest.spyOn` (la integración corre como ESM): se reemplaza `emitir` a mano, una vez.
    const notificaciones = app.get(NotificacionesService);
    const emitir = notificaciones.emitir.bind(notificaciones);
    notificaciones.emitir = () => Promise.reject(new Error('falla forzada'));
    const r = await http().post(`/personas/${id.ana}/baja`).set(como('admin')).send({ confirmacion: 'BAJA' });
    notificaciones.emitir = emitir;
    expect(r.status).toBe(500);
    expect(await prisma.persona.findUnique({ where: { id: id.ana }, select: { nombre: true, dadaDeBajaEn: true } })).toEqual({ nombre: datos().nombre, dadaDeBajaEn: null });
    expect(await prisma.turno.count({ where: { personaId: id.ana, estado: 'asignado' } })).toBe(1);
  });

  it('el Admin la da de baja: se cierran sus cargos, la líder recibe el aviso y su sesión deja de valer', async () => {
    const r = await http().post(`/personas/${id.ana}/baja`).set(como('admin')).send({ confirmacion: ' baja ', motivo: 'Lo pidió por WhatsApp' });
    expect(r.status).toBe(200);
    expect((r.body as ResultadoBaja).cerrados).toMatchObject({ liderazgosMinisterio: 1, membresias: 1, turnos: 1 });
    expect(await prisma.liderMinisterio.count({ where: { personaId: id.ana, hasta: null } })).toBe(0);
    expect(await prisma.postulacion.findFirst({ where: { personaId: id.ana }, select: { estado: true } })).toEqual({ estado: 'inactiva' });
    expect(await prisma.entregaNotificacion.count({ where: { personaId: id.lider, canal: 'app', notificacion: { evento: 'turno.no_puede' } } })).toBe(1);
    expect(await prisma.cambioDeRol.count({ where: { personaId: id.ana, accion: 'quitado' } })).toBe(0); // lider_ministerio no es de cargo
    const persona = await prisma.persona.findUniqueOrThrow({ where: { id: id.ana } });
    expect(persona).toMatchObject({ nombre: 'Persona', apellido: 'dada de baja', email: null, dni: null, fotoUrl: null, telefono: '', direccion: '', rol: [], activo: false, motivoBajaInterno: 'Lo pidió por WhatsApp', dadaDeBajaPorId: id.admin });
    expect(persona.fechaNacimiento.toISOString().slice(0, 10)).toBe('1900-01-01');
    // D258: la sesión que tenía ya no entra.
    expect((await http().get('/personas/me').set(como('ana'))).status).toBe(401);
    // Y no se puede dar de baja dos veces.
    expect((await http().post(`/personas/${id.ana}/baja`).set(como('admin')).send({ confirmacion: 'BAJA' })).status).toBe(404);
  });

  it('SC-001: ningún texto de la base tiene su nombre, email, teléfono, dirección ni DNI', async () => {
    const d = datos();
    for (const valor of [marca, d.email, digitos]) {
      expect({ valor, donde: await apariciones(valor) }).toEqual({ valor, donde: [] });
    }
    expect(await prisma.relacionFamiliar.count({ where: { OR: [{ personaId: id.ana }, { familiarId: id.ana }] } })).toBe(0);
    expect(await prisma.respuestaPreguntaEvento.count({ where: { inscripcion: { personaId: id.ana } } })).toBe(0);
    expect(await prisma.pago.count({ where: { inscripcionEvento: { personaId: id.ana }, comprobanteRuta: { not: null } } })).toBe(0);
    // La tutora no cambió.
    expect(await prisma.persona.findUnique({ where: { id: id.tutora }, select: { activo: true, dadaDeBajaEn: true } })).toEqual({ activo: true, dadaDeBajaEn: null });
  });

  it('SC-003: los registros de otros siguen contando (el turno pasado y la fecha publicada quedan)', async () => {
    expect(await prisma.turno.count({ where: { personaId: id.ana } })).toBe(2);
    expect(await prisma.fechaDeServicio.count({ where: { ministerioId, estado: 'publicada' } })).toBe(2);
  });

  it('la persona se da de baja sola desde su sesión', async () => {
    const r = await http().post('/personas/me/baja').set(como('beto')).send({ confirmacion: 'BAJA', motivo: 'ignorado' });
    expect(r.status).toBe(200);
    expect(await prisma.persona.findUnique({ where: { id: id.beto }, select: { apellido: true, dadaDeBajaPorId: true, motivoBajaInterno: true } })).toEqual({ apellido: 'dada de baja', dadaDeBajaPorId: id.beto, motivoBajaInterno: null });
  });
});
