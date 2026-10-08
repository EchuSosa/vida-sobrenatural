import { cronogramaPropuesto, hoyEnArgentina, sumarDias } from '@vida-sobrenatural/shared-types';
import { LocalStorageProvider } from '../../src/storage/local-storage.provider.js';
import type { ContextoSeedDemo } from './contexto.js';

/**
 * spec 008, T078 (FR-045, D120) — su parte del seed demo, con prefijo `demo-`
 * e idempotente (si la edición en curso ya existe, no hace nada):
 * - una edición en curso a medio liberar (8 semanas, empezó hace 3 semanas),
 *   con dos Líderes, inscriptas `activa`, `dada_de_baja` y `abandono`, una
 *   con 3 faltas, una baja propuesta, y material con datos hostiles (título
 *   de 120, texto de 10.000 con enlaces, archivo con nombre de 200);
 * - una edición finalizada con dos Personas completadas y Aptas para
 *   Ministerio (inscripciones `completada`, el cuarto estado);
 * - una Persona bloqueada por el prerrequisito y otra con un pedido "para la
 *   próxima edición".
 */
const NOMBRE_EN_CURSO = 'demo-Vida de Servicio — edición de primavera';
const NOMBRE_FINALIZADA = 'demo-Vida de Servicio — edición de otoño';
const PDF = Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(400, 0x20), Buffer.from('\n%%EOF\n')]);

export async function sembrarDemo008(ctx: ContextoSeedDemo): Promise<void> {
  const { prisma } = ctx;
  if (await prisma.grupo.findFirst({ where: { nombre: NOMBRE_EN_CURSO }, select: { id: true } })) return;
  const curso = await prisma.curso.findFirst({ where: { categoria: 'vida_de_servicio' }, select: { id: true } });
  const cursoVn = await prisma.curso.findFirst({ where: { categoria: 'vida_nueva' }, select: { id: true } });
  if (!curso || !cursoVn) {
    console.log('seed-demo 008: falta el Curso de Vida de Servicio o de Vida Nueva (corré db:seed); se saltea.');
    return;
  }
  const sedeId = ctx.sedes.laPlata;
  const hoy = hoyEnArgentina();
  const fecha = (f: string) => new Date(`${f}T00:00:00Z`);

  async function persona(clave: string, nombre: string, apellido: string, rol: string[] = ['miembro_registrado']): Promise<string> {
    const email = `demo-vs-${clave}@example.com`;
    const existente = await prisma.persona.findUnique({ where: { email }, select: { id: true } });
    if (existente) return existente.id;
    const p = await prisma.persona.create({
      data: {
        email, nombre, apellido, genero: 'femenino', fechaNacimiento: new Date('1992-04-12'), telefono: '+5492215550800', direccion: 'Calle 12 y 60',
        sedeId, estadoCivil: 'soltero_a', profesion: 'otro', congregaDesde: 2021, estado: 'activa', consentimientoDatos: true, rol,
      },
      select: { id: true },
    });
    return p.id;
  }

  /** Vida Nueva hecha por el sistema (Inscripción completada en un Grupo finalizado), para cumplir el prerrequisito. */
  async function conVidaNueva(personaId: string): Promise<void> {
    const grupo = await prisma.grupo.create({ data: { cursoId: cursoVn!.id, sedeId, estado: 'finalizado', motivoCierre: 'completado', cerradoEn: new Date() }, select: { id: true } });
    const s = await prisma.solicitudDiscipulado.create({
      data: { personaId, estado: 'aprobada', grupoId: grupo.id, franjas: { create: [{ diaSemana: 2, inicio: 19 * 60, fin: 21 * 60 }] } },
      select: { id: true },
    });
    await prisma.inscripcion.create({ data: { personaId, grupoId: grupo.id, solicitudId: s.id, estado: 'completada', cerradaEn: new Date() } });
  }

  async function inscribir(personaId: string, grupoId: string, estado: 'activa' | 'completada' | 'dada_de_baja' | 'abandono', cerradaEn: Date | null = null) {
    const s = await prisma.solicitudVidaServicio.create({ data: { personaId, grupoId, estado: 'aprobada', revisadaEn: new Date() }, select: { id: true } });
    const i = await prisma.inscripcion.create({ data: { personaId, grupoId, solicitudVidaServicioId: s.id, estado, cerradaEn, createdAt: fecha(sumarDias(hoy, -25)) }, select: { id: true } });
    return i.id;
  }

  const lider1 = await persona('lider-1', 'Marta', 'Líder Demo', ['miembro_registrado', 'lider_curso']);
  const lider2 = await persona('lider-2', 'Julián', 'Líder Demo', ['miembro_registrado', 'lider_curso']);

  // --- Edición en curso, a medio liberar ---
  const inicio = sumarDias(hoy, -21);
  const fechas = cronogramaPropuesto(inicio, 8);
  const enCurso = await prisma.grupo.create({
    data: {
      cursoId: curso.id, sedeId, nombre: NOMBRE_EN_CURSO, fechaInicio: fecha(inicio), inscripcionAbierta: true,
      items: { create: fechas.map((f, i) => ({ numeroSemana: i + 1, fechaLiberacion: fecha(f) })) },
      liderazgos: { create: [{ personaId: lider1 }, { personaId: lider2 }] },
    },
    select: { id: true },
  });
  const items = await prisma.itemCronograma.findMany({ where: { grupoId: enCurso.id }, orderBy: { numeroSemana: 'asc' }, select: { id: true } });
  const storage = new LocalStorageProvider();
  const textoLargo = Array.from({ length: 200 }, (_, i) => `Párrafo ${i + 1}: leé con calma y anotá lo que te llame la atención. Más en https://example.com/recursos/${i + 1}`)
    .join('\n\n')
    .slice(0, 10_000);
  // Semana 1: liberada, con datos hostiles. Semana 2: liberada simple. Semana 3 (hoy): sin material. Semana 5: cargada, por liberar.
  const c1 = await prisma.contenido.create({
    data: { grupoId: enCurso.id, itemCronogramaId: items[0].id, titulo: 'T'.repeat(118) + 'é!', texto: textoLargo, cargadoPorId: lider1, liberacionAvisadaEn: new Date() },
    select: { id: true },
  });
  const { ruta } = await storage.subirPrivado('contenidos', { buffer: PDF, nombreOriginal: 'guia.pdf', mimeType: 'application/pdf' });
  await prisma.archivoContenido.create({
    data: { contenidoId: c1.id, ruta, nombreOriginal: `${'guia-de-la-semana-con-un-nombre-muy-largo-'.repeat(5)}.pdf`.slice(0, 200), mimeType: 'application/pdf', tamanioBytes: PDF.length, orden: 1 },
  });
  await prisma.enlaceContenido.create({ data: { contenidoId: c1.id, texto: 'La prédica del domingo', url: 'https://example.com/predica', orden: 1 } });
  await prisma.contenido.create({ data: { grupoId: enCurso.id, itemCronogramaId: items[1].id, titulo: 'Los dones al servicio de otros', texto: 'Leé 1 Pedro 4:10.', cargadoPorId: lider2, liberacionAvisadaEn: new Date() } });
  await prisma.contenido.create({ data: { grupoId: enCurso.id, itemCronogramaId: items[4].id, titulo: 'Servir en equipo', texto: 'Para la semana 5.', cargadoPorId: lider1 } });

  const activas: string[] = [];
  for (const [i, nombre] of ['Ana', 'Bruno', 'Carla', 'Diego'].entries()) {
    const p = await persona(`activa-${i + 1}`, nombre, 'En Curso Demo');
    await conVidaNueva(p);
    activas.push(await inscribir(p, enCurso.id, 'activa'));
  }
  const baja = await persona('baja', 'Elena', 'Baja Demo');
  await conVidaNueva(baja);
  await inscribir(baja, enCurso.id, 'dada_de_baja', fecha(sumarDias(hoy, -10)));
  const abandono = await persona('abandono', 'Fermín', 'Abandono Demo');
  await conVidaNueva(abandono);
  await inscribir(abandono, enCurso.id, 'abandono', fecha(sumarDias(hoy, -3)));
  // Asistencia de las tres semanas: Carla faltó a las tres (alerta), Diego a una.
  for (const [n, f] of fechas.slice(0, 3).entries()) {
    const enc = await prisma.encuentro.create({ data: { grupoId: enCurso.id, fecha: fecha(f), registradoPorId: n % 2 === 0 ? lider1 : lider2 }, select: { id: true } });
    await prisma.asistencia.createMany({
      data: activas.map((inscripcionId, i) => ({ encuentroId: enc.id, inscripcionId, presente: !(i === 2 || (i === 3 && n === 1)) })),
    });
  }
  // Una baja propuesta por el Líder, esperando al Admin.
  await prisma.inscripcion.update({
    where: { id: activas[2] },
    data: { bajaPropuestaEn: new Date(), bajaPropuestaPorId: lider1, bajaPropuestaTipo: 'abandono', bajaPropuestaMotivo: 'Hace tres semanas que no viene y no responde.' },
  });

  // --- Edición finalizada, con Aptas para Ministerio ---
  const inicioOtonio = sumarDias(hoy, -120);
  const finalizada = await prisma.grupo.create({
    data: {
      cursoId: curso.id, sedeId, nombre: NOMBRE_FINALIZADA, fechaInicio: fecha(inicioOtonio), estado: 'finalizado', motivoCierre: 'completado',
      cerradoEn: fecha(sumarDias(inicioOtonio, 60)), inscripcionAbierta: false,
      items: { create: cronogramaPropuesto(inicioOtonio, 8).map((f, i) => ({ numeroSemana: i + 1, fechaLiberacion: fecha(f) })) },
      liderazgos: { create: [{ personaId: lider1 }] },
    },
    select: { id: true },
  });
  for (const [i, nombre] of ['Gabriela', 'Hernán'].entries()) {
    const p = await persona(`apta-${i + 1}`, nombre, 'Apto Demo', ['miembro_registrado', 'apto_ministerio']);
    await conVidaNueva(p);
    await inscribir(p, finalizada.id, 'completada', fecha(sumarDias(inicioOtonio, 60)));
  }

  // --- Una bloqueada por el prerrequisito y un pedido "para la próxima edición" ---
  await persona('sin-vida-nueva', 'Inés', 'Sin Vida Nueva Demo');
  const proxima = await persona('proxima', 'Joaquín', 'Próxima Edición Demo');
  await conVidaNueva(proxima);
  await prisma.solicitudVidaServicio.create({ data: { personaId: proxima, grupoId: null } });
  console.log('seed-demo 008: ediciones de Vida de Servicio (en curso y finalizada) sembradas.');
}
