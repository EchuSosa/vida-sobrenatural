import type { ContextoSeedDemo } from './contexto.js';

/**
 * spec 006 — su parte del seed demo (D120, FR-043). Idempotente por email:
 * si la Persona ya existe, no se toca. Lote A/B: una Persona por estado del
 * historial previo (declaraciones pendiente, rechazada y confirmada;
 * Completitudes vigentes y anuladas), con nombres largos, apellidos
 * compuestos y un comentario de 500 caracteres con tildes.
 */
export async function sembrarDemo006(ctx: ContextoSeedDemo): Promise<void> {
  const { prisma, sedes } = ctx;
  const admin = await prisma.persona.findFirst({ where: { rol: { has: 'admin' } }, select: { id: true } });

  const comunes = {
    sedeId: sedes.laPlata,
    estadoCivil: 'casado_a' as const,
    profesion: 'educacion' as const,
    congregaDesde: 2015,
    fechaNacimiento: new Date('1972-03-14'),
    genero: 'femenino' as const,
    direccion: 'Calle 7 N°1234, La Plata',
    estado: 'activa' as const,
    activo: true,
    consentimientoDatos: true,
    rol: ['miembro_registrado'],
  };

  async function persona(email: string, nombre: string, apellido: string, telefono: string): Promise<{ id: string; nueva: boolean }> {
    const existente = await prisma.persona.findUnique({ where: { email }, select: { id: true } });
    if (existente) return { id: existente.id, nueva: false };
    const creada = await prisma.persona.create({ data: { ...comunes, email, nombre, apellido, telefono }, select: { id: true } });
    return { id: creada.id, nueva: true };
  }

  // Quien "revisó" y "registró": el Admin del seed si hay; si no, la propia Persona (referencia lógica, sin FK).
  const revisor = (personaId: string) => admin?.id ?? personaId;

  const declaroVn = await persona('demo-camino-declaro-vida-nueva@example.com', 'María de las Mercedes', 'Gutiérrez Ocampo', '+54 9 221 810-0001');
  if (declaroVn.nueva) {
    await prisma.declaracionHistorial.create({ data: { personaId: declaroVn.id, etapa: 'vida_nueva', comentario: 'La hice en 2018 en la iglesia de City Bell.' } });
  }

  const declaroBautismo = await persona('demo-camino-declaro-bautismo@example.com', 'José Ignacio', 'Pérez de la Serna', '+54 9 221 810-0002');
  if (declaroBautismo.nueva) {
    const base = 'Me bauticé en el verano de 2009 en la Iglesia Evangélica de Tolosa, en una celebración al aire libre junto al arroyo, con mi mamá, mi abuela y mis dos hermanos. Me acompañó el pastor Rodríguez, que después se mudó a Córdoba. Tengo fotos y un certificado firmado que puedo traer cuando haga falta. ';
    const comentario = base.repeat(3).slice(0, 500);
    await prisma.declaracionHistorial.create({ data: { personaId: declaroBautismo.id, etapa: 'bautismo', comentario } });
  }

  const rechazada = await persona('demo-camino-rechazada@example.com', 'Ana Lucía', 'Fernández Martínez', '+54 9 221 810-0003');
  if (rechazada.nueva) {
    await prisma.declaracionHistorial.create({
      data: {
        personaId: rechazada.id,
        etapa: 'vida_de_servicio',
        estado: 'rechazada',
        comentario: 'Hice el curso en otra congregación.',
        revisadoPorId: revisor(rechazada.id),
        revisadaEn: new Date('2026-10-01T13:00:00Z'),
        motivoRechazo: 'No encontramos el registro. Traenos el certificado y lo vemos juntos.',
      },
    });
  }

  const confirmada = await persona('demo-camino-confirmada@example.com', 'Ñoño Esteban', 'Núñez Peña', '+54 9 221 810-0004');
  if (confirmada.nueva) {
    const declaracion = await prisma.declaracionHistorial.create({
      data: { personaId: confirmada.id, etapa: 'vida_nueva', estado: 'confirmada', revisadoPorId: revisor(confirmada.id), revisadaEn: new Date('2026-09-20T15:00:00Z') },
    });
    await prisma.completitudManual.create({
      data: { personaId: confirmada.id, etapa: 'vida_nueva', origen: 'declaracion', declaracionId: declaracion.id, registradaPorId: revisor(confirmada.id) },
    });
  }

  const anulada = await persona('demo-camino-anulada@example.com', 'Beatriz Eugenia', 'Coronel Villanueva', '+54 9 221 810-0005');
  if (anulada.nueva) {
    await prisma.completitudManual.create({
      data: {
        personaId: anulada.id,
        etapa: 'bautismo',
        origen: 'admin',
        nota: 'Cargada por error en la persona equivocada.',
        registradaPorId: revisor(anulada.id),
        anuladaEn: new Date('2026-09-25T12:00:00Z'),
        anuladaPorId: revisor(anulada.id),
      },
    });
    await prisma.completitudManual.create({
      data: { personaId: anulada.id, etapa: 'bautismo', origen: 'admin', nota: 'Bautizada en 1990, lo confirmó la pastora.', registradaPorId: revisor(anulada.id) },
    });
  }

  console.log('Mi camino (006): declaraciones y Completitudes demo listas (o ya existentes).');
}
