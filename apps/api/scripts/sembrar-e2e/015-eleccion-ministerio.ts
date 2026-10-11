import type { ContextoSembrarE2e } from './contexto.js';

/**
 * spec 015 (D239–D242) — fixtures de e2e de la elección de ministerio: una
 * edición de Vida de Servicio en curso con la elección abierta, su líder y
 * tres inscriptas — dos para elegir (escritorio y celular) y una con la
 * charla hecha y apta, para que el Admin confirme. Usa los Ministerios
 * `e2e-` de la 009. Los e2e dejan cada elección como la encuentran
 * (helpers-015.ts). Idempotente.
 */
export const EMAILS_E2E_015 = {
  lider: 'e2e-elm-lider@example.com',
  persona: 'e2e-elm-persona@example.com',
  personaCelular: 'e2e-elm-persona-celular@example.com',
  charlada: 'e2e-elm-charlada@example.com',
} as const;

export const EDICION_E2E_015 = 'e2e-Edición con elección de ministerio';

export async function sembrarE2e015({ prisma, sedeId }: ContextoSembrarE2e): Promise<void> {
  async function persona(email: string, nombre: string, rol: string[]) {
    const existente = await prisma.persona.findUnique({ where: { email }, select: { id: true } });
    if (existente) return existente.id;
    const p = await prisma.persona.create({
      data: {
        email,
        nombre,
        apellido: 'E2E Elección',
        genero: 'femenino',
        fechaNacimiento: new Date('1992-04-12'),
        telefono: '+54 9 221 555-0150',
        direccion: 'Calle 1 N°100, La Plata',
        sedeId,
        estadoCivil: 'soltero_a',
        profesion: 'otro',
        congregaDesde: 2021,
        estado: 'activa',
        consentimientoDatos: true,
        rol,
      },
      select: { id: true },
    });
    return p.id;
  }
  const lider = await persona(EMAILS_E2E_015.lider, 'Lucía', ['miembro_registrado', 'lider_curso']);
  const elige = await persona(EMAILS_E2E_015.persona, 'Elena', ['miembro_registrado']);
  const eligeCelular = await persona(EMAILS_E2E_015.personaCelular, 'Ema', ['miembro_registrado']);
  const charlada = await persona(EMAILS_E2E_015.charlada, 'Clara', ['miembro_registrado', 'apto_ministerio']);

  let grupo = await prisma.grupo.findFirst({ where: { nombre: EDICION_E2E_015 }, select: { id: true } });
  if (!grupo) {
    const curso = await prisma.curso.findFirst({ where: { categoria: 'vida_de_servicio', eliminadoEn: null }, orderBy: { tipo: 'asc' }, select: { id: true } });
    if (!curso) throw new Error('sembrar-e2e 015: falta el Curso "Vida de Servicio" (corré el seed).');
    grupo = await prisma.grupo.create({
      data: { cursoId: curso.id, sedeId, nombre: EDICION_E2E_015, fechaInicio: new Date(), eleccionAbierta: true, liderazgos: { create: [{ personaId: lider }] } },
      select: { id: true },
    });
  }
  for (const personaId of [elige, eligeCelular, charlada]) {
    if (await prisma.inscripcion.findFirst({ where: { personaId, grupoId: grupo.id }, select: { id: true } })) continue;
    const s = await prisma.solicitudVidaServicio.create({ data: { personaId, grupoId: grupo.id, estado: 'aprobada', revisadaEn: new Date() }, select: { id: true } });
    await prisma.inscripcion.create({ data: { personaId, grupoId: grupo.id, solicitudVidaServicioId: s.id, estado: 'activa' } });
  }
  console.log('sembrar-e2e 015: edición con la elección de ministerio abierta lista.');
}
