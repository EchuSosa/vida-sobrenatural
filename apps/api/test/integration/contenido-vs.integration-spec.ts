import type { INestApplication } from '@nestjs/common';
import type { Server } from 'node:http';
import request from 'supertest';
import {
  ARCHIVO_MAX_BYTES,
  cronogramaPropuesto,
  hoyEnArgentina,
  sumarDias,
  type ContenidoParaLider,
  type EstadoMiVidaDeServicio,
  type MiGrupoDetalle,
  type MiGrupoResumen,
} from '@vida-sobrenatural/shared-types';
import type { PrismaService } from '../../src/prisma/prisma.service.js';
import { NotificacionesService } from '../../src/notificaciones/notificaciones.service.js';
import { ContenidoService } from '../../src/vida-de-servicio/contenido.service.js';
import { levantarApp, tokenDe } from './discipulado-fixtures.js';
import { registrarAvisos } from './camino-fixtures.js';
import { EscenarioVS } from './vida-de-servicio-fixtures.js';
import { ESPERA_CANDADO_CURSOS } from './candado-cursos.js';

const PDF = Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(200, 0x20), Buffer.from('\n%%EOF')]);
const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8ffff3f0005fe02fea7d6a4f00000000049454e44ae426082', 'hex');

/**
 * spec 008, T040 + T073 (FR-019 a FR-024; Historia 4, escenarios 2 a 9;
 * SC-003, SC-006): el Líder ve solo sus ediciones, carga y edita el material,
 * la Persona lo ve el día de su fecha, el aviso sale una sola vez, y los
 * archivos son privados (solo quien tiene derecho los baja).
 */
describe('Vida de Servicio — Mis grupos y el material (spec 008, T040/T073)', () => {
  let app: INestApplication<Server>;
  let prisma: PrismaService;
  let vs: EscenarioVS;
  let avisos: ReturnType<typeof registrarAvisos>;
  let lider1: string;
  let lider2: string;
  let adminId: string;
  const LIDER = ['miembro_registrado', 'lider_curso'];
  const MIEMBRO = ['miembro_registrado'];
  const ADMIN = ['miembro_registrado', 'admin'];
  const hoy = hoyEnArgentina();

  async function como(personaId: string, rol: string[], metodo: 'get' | 'post' | 'put', ruta: string, cuerpo?: object) {
    const req = request(app.getHttpServer())[metodo](ruta).set('Authorization', `Bearer ${await tokenDe(personaId, rol)}`);
    return cuerpo ? req.send(cuerpo) : req;
  }

  async function cargar(
    personaId: string,
    grupoId: string,
    numero: number,
    campos: Record<string, string>,
    archivos: Array<{ buffer: Buffer; nombre: string; alt?: string }> = [],
  ) {
    const req = request(app.getHttpServer())
      .put(`/vida-de-servicio/mis-grupos/${grupoId}/semanas/${numero}`)
      .set('Authorization', `Bearer ${await tokenDe(personaId, LIDER)}`);
    for (const [k, v] of Object.entries(campos)) req.field(k, v);
    for (const a of archivos) {
      req.attach('archivosNuevos', a.buffer, a.nombre);
      req.field('textoAlternativo', a.alt ?? '');
    }
    return req;
  }

  /** 4 semanas: hace 14 días, hace 7, hoy y en 7 días. */
  const fechas = () => cronogramaPropuesto(sumarDias(hoy, -14), 4);

  beforeAll(async () => {
    ({ app, prisma } = await levantarApp());
    avisos = registrarAvisos(app.get(NotificacionesService));
    vs = new EscenarioVS(prisma, `cvs-${Date.now()}`);
    await vs.preparar();
    lider1 = await vs.lider('lider1');
    lider2 = await vs.lider('lider2');
    adminId = await vs.persona('admin', { rol: ADMIN });
  }, ESPERA_CANDADO_CURSOS);

  afterAll(async () => {
    avisos.restaurar();
    await vs.limpiar();
    await app.close();
  });

  beforeEach(() => {
    avisos.emitidos.length = 0;
  });

  it('T073: cada Líder ve solo sus ediciones; sacado del Grupo deja de verla; sin lider_curso no hay "mis grupos" (SC-006, D134)', async () => {
    const g1 = await vs.edicion({ nombre: `Del uno ${vs.sufijo}`, inicio: sumarDias(hoy, -14), fechas: fechas(), lideres: [lider1] });
    const g2 = await vs.edicion({ nombre: `Del dos ${vs.sufijo}`, lideres: [lider2] });
    const lista = (await como(lider1, LIDER, 'get', '/vida-de-servicio/mis-grupos')).body as MiGrupoResumen[];
    expect(lista.map((g) => g.grupoId)).toContain(g1);
    expect(lista.map((g) => g.grupoId)).not.toContain(g2);
    expect(lista.find((g) => g.grupoId === g1)).toMatchObject({ estado: 'en_curso', semanasSinMaterialVencidas: 3, proximaSemana: { numero: 3, conMaterial: false } });
    const ajeno = await como(lider1, LIDER, 'get', `/vida-de-servicio/mis-grupos/${g2}`);
    expect(ajeno.status).toBe(404);
    expect(ajeno.body.code).toBe('GRUPO_NO_ENCONTRADO');
    expect((await cargar(lider1, g2, 1, { titulo: 'x', texto: 'y' })).status).toBe(404);

    await prisma.liderazgo.updateMany({ where: { grupoId: g1, personaId: lider1 }, data: { hasta: new Date() } });
    expect((await como(lider1, LIDER, 'get', `/vida-de-servicio/mis-grupos/${g1}`)).status).toBe(404);
    expect((await como(adminId, ADMIN, 'get', '/vida-de-servicio/mis-grupos')).status).toBe(403);
  });

  it('el detalle del Líder: inscriptos con teléfono solo de las activas (Pregunta 3) y las semanas con su estado', async () => {
    const g = await vs.edicion({ inicio: sumarDias(hoy, -14), fechas: fechas(), lideres: [lider1] });
    const a = await vs.apta('detalle-a');
    const b = await vs.apta('detalle-b');
    await vs.inscribir(a, g);
    await vs.inscribir(b, g, 'abandono');
    await vs.material(g, 4, lider1);
    const d = (await como(lider1, LIDER, 'get', `/vida-de-servicio/mis-grupos/${g}`)).body as MiGrupoDetalle;
    expect(d.semanas.map((s) => s.estado)).toEqual(['vencida_sin_material', 'vencida_sin_material', 'vencida_sin_material', 'cargado_por_liberar']);
    expect(d.inscriptos.map((i) => [i.personaId, i.estado, i.telefono !== null])).toEqual([[a, 'activa', true], [b, 'abandono', false]]);
    expect(d.finalizacion.sePuedeProponerDesde).toBe(fechas()[3]);
  });

  it('cargar: futura no se ve; la de hoy se ve y avisa una vez; editar no avisa; queda quién cargó y quién editó (escenarios 2 a 6)', async () => {
    const g = await vs.edicion({ inicio: sumarDias(hoy, -14), fechas: fechas(), lideres: [lider1, lider2] });
    const a = await vs.apta('ve');
    await vs.inscribir(a, g);

    const futura = await cargar(lider1, g, 4, { titulo: 'Semana cuatro', texto: 'Para leer' });
    expect(futura.status).toBe(200);
    expect(futura.body).toMatchObject({ estado: 'cargado_por_liberar', cargadoPor: { id: lider1 } });
    expect(avisos.emitidos).toEqual([]);
    expect((await como(a, MIEMBRO, 'get', '/vida-de-servicio/me/semanas/4')).status).toBe(404);

    const deHoy = await cargar(lider1, g, 3, { titulo: 'Semana tres', texto: 'Mirá https://example.com', enlaces: JSON.stringify([{ texto: 'El video', url: 'https://example.com/v' }]) });
    expect(deHoy.body).toMatchObject({ estado: 'liberada', enlaces: [{ texto: 'El video', url: 'https://example.com/v' }] });
    const item3 = await prisma.itemCronograma.findFirstOrThrow({ where: { grupoId: g, numeroSemana: 3 }, select: { id: true } });
    expect(avisos.emitidos).toEqual([{ nombre: 'vida_servicio.contenido_liberado', a: { tipo: 'grupo', grupoId: g }, datos: { grupoId: g, cronogramaItemId: item3.id, semana: 3 } }]);
    expect((await como(a, MIEMBRO, 'get', '/vida-de-servicio/me/semanas/3')).body).toMatchObject({ titulo: 'Semana tres' });

    avisos.emitidos.length = 0;
    const editada = await cargar(lider2, g, 3, { titulo: 'Semana tres (corregida)', texto: 'Otro texto', enlaces: '[]' });
    expect(editada.body).toMatchObject({ titulo: 'Semana tres (corregida)', enlaces: [], cargadoPor: { id: lider1 }, editadoPor: { id: lider2 } });
    expect(avisos.emitidos).toEqual([]);

    // Una pasada sin material: al cargar queda liberada y avisa (escenario 5).
    const pasada = await cargar(lider1, g, 1, { titulo: 'Semana uno', texto: 'Tarde, pero llega' });
    expect(pasada.body.estado).toBe('liberada');
    expect(avisos.emitidos.map((e) => e.nombre)).toEqual(['vida_servicio.contenido_liberado']);
    const mia = (await como(a, MIEMBRO, 'get', '/vida-de-servicio/me')).body as EstadoMiVidaDeServicio;
    expect(mia.estado === 'en_curso' && mia.semanas.map((s) => s.estado)).toEqual(['liberada', 'sin_material', 'liberada', 'proxima']);
  });

  it('validación por campo: título, material vacío, enlaces, archivos de más, tipo falso, sin texto alternativo, demasiado grande (escenarios 7 y 8)', async () => {
    const g = await vs.edicion({ lideres: [lider1] });
    const vacio = await cargar(lider1, g, 1, { titulo: '' });
    expect(vacio.body.errors).toEqual([{ campo: 'titulo', code: 'TITULO_REQUERIDO' }]);
    const sinMaterial = await cargar(lider1, g, 1, { titulo: 'Solo título' });
    expect(sinMaterial.body.errors).toEqual([{ campo: 'texto', code: 'MATERIAL_VACIO' }]);
    const enlaces = await cargar(lider1, g, 1, { titulo: 'T', texto: 'x', enlaces: JSON.stringify([{ texto: '', url: 'javascript:alert(1)' }]) });
    expect(enlaces.body.errors).toEqual([{ campo: 'enlaces.0.texto', code: 'ENLACE_TEXTO_REQUERIDO' }, { campo: 'enlaces.0.url', code: 'ENLACE_URL_INVALIDA' }]);
    const falso = await cargar(lider1, g, 1, { titulo: 'T' }, [{ buffer: Buffer.from('<html>no soy un pdf</html>'), nombre: 'guia.pdf' }]);
    expect(falso.body.errors).toEqual([{ campo: 'archivosNuevos.0', code: 'ARCHIVO_TIPO_NO_ADMITIDO' }]);
    const sinAlt = await cargar(lider1, g, 1, { titulo: 'T' }, [{ buffer: PNG, nombre: 'lamina.png' }]);
    expect(sinAlt.body.errors).toEqual([{ campo: 'textoAlternativo.0', code: 'TEXTO_ALTERNATIVO_REQUERIDO' }]);
    const grande = await cargar(lider1, g, 1, { titulo: 'T' }, [{ buffer: Buffer.concat([PDF, Buffer.alloc(ARCHIVO_MAX_BYTES)]), nombre: 'enorme.pdf' }]);
    expect(grande.body.errors).toEqual([{ campo: 'archivosNuevos.0', code: 'ARCHIVO_DEMASIADO_GRANDE' }]);
    const seis = await cargar(lider1, g, 1, { titulo: 'T' }, Array.from({ length: 6 }, (_, i) => ({ buffer: PDF, nombre: `g${i}.pdf` })));
    expect(seis.body.errors).toEqual([{ campo: 'archivosNuevos', code: 'DEMASIADOS_ARCHIVOS' }]);
    expect(await prisma.contenido.count({ where: { grupoId: g } })).toBe(0);
    expect((await cargar(lider1, g, 9, { titulo: 'T', texto: 'x' })).body.code).toBe('SEMANA_NO_ENCONTRADA');
  });

  it('archivos privados: la inscripta, el Líder y el Admin los bajan; un ajeno, un Líder de otra edición y una dada de baja (semana posterior) no (escenario 9, FR-024)', async () => {
    const g = await vs.edicion({ inicio: sumarDias(hoy, -14), fechas: fechas(), lideres: [lider1] });
    const otra = await vs.edicion({ lideres: [lider2] });
    void otra;
    const res = await cargar(lider1, g, 3, { titulo: 'Con archivos' }, [
      { buffer: PDF, nombre: 'guía semana 3.pdf' },
      { buffer: PNG, nombre: 'lamina.png', alt: 'La lámina de la semana' },
    ]);
    expect(res.status).toBe(200);
    const contenido = res.body as Extract<ContenidoParaLider, { titulo: string }>;
    expect(contenido.archivos.map((a) => [a.nombre, a.mimeType, a.textoAlternativo])).toEqual([
      ['guía semana 3.pdf', 'application/pdf', null],
      ['lamina.png', 'image/png', 'La lámina de la semana'],
    ]);
    const pdfId = contenido.archivos[0].id;

    const inscripta = await vs.apta('baja-archivo');
    await vs.inscribir(inscripta, g);
    const baja = await vs.apta('dada-de-baja');
    await vs.inscribir(baja, g, 'dada_de_baja', new Date(`${sumarDias(hoy, -10)}T15:00:00Z`));
    const ajena = await vs.apta('ajena');

    const bajar = (id: string, rol: string[]) => como(id, rol, 'get', `/vida-de-servicio/archivos/${pdfId}`);
    const ok = await bajar(inscripta, MIEMBRO);
    expect(ok.status).toBe(200);
    expect(ok.headers['content-type']).toBe('application/pdf');
    expect(ok.headers['cache-control']).toBe('private, no-store');
    expect(ok.headers['x-content-type-options']).toBe('nosniff');
    expect(ok.headers['content-disposition']).toBe(`inline; filename*=UTF-8''${encodeURIComponent('guía semana 3.pdf')}`);
    expect((await bajar(lider1, LIDER)).status).toBe(200);
    expect((await bajar(adminId, ADMIN)).status).toBe(200);
    for (const [id, rol] of [[ajena, MIEMBRO], [lider2, LIDER], [baja, MIEMBRO]] as const) {
      const r = await bajar(id, rol);
      expect(r.status).toBe(404);
      expect(r.body.code).toBe('CONTENIDO_NO_DISPONIBLE');
    }

    // Quitar un archivo al editar: deja de bajarse.
    await cargar(lider1, g, 3, { titulo: 'Con archivos', archivosQuitar: JSON.stringify([pdfId]) });
    expect((await bajar(lider1, LIDER)).status).toBe(404);
  });

  it('marcarLiberacionesDeHoy: dos corridas a la vez → un solo aviso por Contenido (research #4)', async () => {
    const g = await vs.edicion({ inicio: sumarDias(hoy, -14), fechas: fechas(), lideres: [lider1] });
    const item = await prisma.itemCronograma.findFirstOrThrow({ where: { grupoId: g, numeroSemana: 2 }, select: { id: true } });
    await prisma.contenido.create({ data: { grupoId: g, itemCronogramaId: item.id, titulo: 'Cargada antes', texto: 'x', cargadoPorId: lider1 } });
    const servicio = app.get(ContenidoService);
    await Promise.all([servicio.marcarLiberacionesDeHoy(hoy), servicio.marcarLiberacionesDeHoy(hoy)]);
    const deEste = avisos.emitidos.filter((e) => e.nombre === 'vida_servicio.contenido_liberado' && (e.datos as { grupoId: string }).grupoId === g);
    expect(deEste).toHaveLength(1);
    expect(await servicio.marcarLiberacionesDeHoy(hoy)).toBe(0);
  });
});
