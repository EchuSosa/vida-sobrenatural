import type { ContextoSeedDemo } from './contexto.js';

/**
 * spec 015 (D239–D242) — datos de demo de la elección de ministerio, sobre la
 * edición en curso de la 008 ("demo-Vida de Servicio — edición de
 * primavera"), con los Ministerios reales de la 009 (docs/22): la elección
 * abierta; Ana (`demo-vs-activa-1@`) eligió y le falta la charla; Bruno
 * (`demo-vs-activa-2@`) ya charló con Marta (notas privadas) y espera al
 * Admin pero todavía no es apto (no se puede confirmar); Diego
 * (`demo-vs-activa-4@`) todavía no eligió, para probar el flujo entero. En la
 * edición finalizada, Gabriela (`demo-vs-apta-1@`, apta) tiene la charla
 * hecha: el Admin la puede confirmar. Idempotente.
 */
export async function sembrarDemo015({ prisma }: ContextoSeedDemo): Promise<void> {
  const grupo = await prisma.grupo.findFirst({ where: { nombre: 'demo-Vida de Servicio — edición de primavera' }, select: { id: true } });
  if (!grupo) return;
  if (await prisma.eleccionMinisterio.count({ where: { grupoId: grupo.id } })) return;
  await prisma.grupo.update({ where: { id: grupo.id }, data: { eleccionAbierta: true } });

  const persona = async (email: string) => (await prisma.persona.findUnique({ where: { email }, select: { id: true } }))?.id ?? null;
  const area = async (ministerio: string, celula: string | null) => {
    const m = await prisma.ministerio.findFirst({ where: { nombre: ministerio, eliminadoEn: null }, select: { id: true } });
    if (!m) return null;
    if (celula === null) return { ministerioId: m.id, celulaId: null, enParalelo: false };
    const c = await prisma.celula.findFirst({ where: { ministerioId: m.id, nombre: celula, eliminadoEn: null }, select: { id: true, ofreceRolDiscipulador: true } });
    return c ? { ministerioId: m.id, celulaId: c.id, enParalelo: c.ofreceRolDiscipulador } : null;
  };
  const lider = await persona('demo-vs-lider-1@example.com');
  const ana = await persona('demo-vs-activa-1@example.com');
  const bruno = await persona('demo-vs-activa-2@example.com');

  if (ana) {
    const opciones = (await Promise.all([area('Ministerio de Bienvenida', 'Consolidadores'), area('Mesa de entrada', null)])).filter((x) => x !== null);
    await prisma.eleccionMinisterio.create({
      data: { personaId: ana, grupoId: grupo.id, comentario: 'Me gusta recibir a la gente nueva.', editadaPorId: ana, opciones: { create: opciones } },
    });
  }
  if (bruno && lider) {
    const opciones = (await Promise.all([area('Adoración', 'Voces'), area('Ministerio Enseñanza', 'Discipulados Vida Nueva')])).filter((x) => x !== null);
    const ahora = new Date();
    await prisma.eleccionMinisterio.create({
      data: {
        personaId: bruno,
        grupoId: grupo.id,
        estado: 'charla_hecha',
        comentario: 'Canto desde chico.',
        notas: 'Tiene experiencia en coro. Le conviene la audición del próximo mes. Quiere acompañar a alguien nuevo.',
        notasPorId: lider,
        notasEn: ahora,
        charlaPorId: lider,
        charlaEn: ahora,
        editadaPorId: bruno,
        opciones: { create: opciones },
      },
    });
  }
  const gabriela = await persona('demo-vs-apta-1@example.com');
  const finalizada = await prisma.grupo.findFirst({ where: { nombre: { startsWith: 'demo-Vida de Servicio' }, estado: 'finalizado' }, select: { id: true } });
  if (gabriela && lider && finalizada) {
    const opciones = (await Promise.all([area('Ministerio de Bienvenida', 'Seguridad'), area('Multimedia', null)])).filter((x) => x !== null);
    const ahora = new Date();
    await prisma.eleccionMinisterio.create({
      data: {
        personaId: gabriela,
        grupoId: finalizada.id,
        estado: 'charla_hecha',
        comentario: 'Me gusta la fotografía y cuidar el orden.',
        notas: 'Muy responsable. Para Multimedia le conviene la capacitación de fotografía.',
        notasPorId: lider,
        notasEn: ahora,
        charlaPorId: lider,
        charlaEn: ahora,
        editadaPorId: gabriela,
        opciones: { create: opciones },
      },
    });
  }
  console.log('seed-demo 015: elección de ministerio abierta en la edición en curso.');
}
