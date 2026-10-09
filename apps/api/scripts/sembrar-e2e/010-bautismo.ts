import type { ContextoSembrarE2e } from './contexto.js';

/**
 * spec 010 — sus fixtures de e2e (T014). Lo que la API no deja armar: un
 * Evento de bautismo YA PASADO con Personas asignadas (asignar exige un
 * Evento futuro, FR-012). Uno para la card "Estamos confirmando tu bautismo"
 * de la web y otro para "Confirmar bautismos" del backoffice. Todo lo demás
 * (pedir, aceptar, asignar a un Evento futuro) lo arman los e2e por la API.
 * Personas `e2e-bautismo-…@example.com` y Eventos `e2e-…`: los borra
 * `limpiar-e2e.ts`. Idempotente.
 */
export const EMAIL_BAUTISMO_CONFIRMANDO = 'e2e-bautismo-confirmando@example.com';
export const EMAILS_BAUTISMO_A_CONFIRMAR = ['e2e-bautismo-confirmar-1@example.com', 'e2e-bautismo-confirmar-2@example.com', 'e2e-bautismo-confirmar-3@example.com'];

export async function sembrarE2e010(ctx: ContextoSembrarE2e): Promise<void> {
  const { prisma, sedeId } = ctx;
  const admin = await prisma.persona.findUnique({ where: { email: 'e2e-admin@example.com' }, select: { id: true } });
  if (!admin) throw new Error('sembrar-e2e 010: falta e2e-admin.');

  async function persona(email: string, nombre: string, apellido: string): Promise<string> {
    const existente = await prisma.persona.findUnique({ where: { email }, select: { id: true } });
    if (existente) return existente.id;
    const creada = await prisma.persona.create({
      data: {
        email,
        nombre,
        apellido,
        genero: 'femenino',
        fechaNacimiento: new Date('1988-04-12'),
        telefono: '+54 9 221 900-0010',
        direccion: 'Calle 50 y 15, La Plata',
        sedeId,
        estadoCivil: 'soltero_a',
        profesion: 'otro',
        congregaDesde: 2021,
        estado: 'activa',
        consentimientoDatos: true,
        rol: ['miembro_registrado'],
      },
      select: { id: true },
    });
    return creada.id;
  }

  async function eventoPasado(slug: string, nombre: string): Promise<string> {
    const existente = await prisma.evento.findUnique({ where: { slug }, select: { id: true } });
    if (existente) return existente.id;
    const inicio = new Date(Date.now() - 3 * 86_400_000);
    const creado = await prisma.evento.create({
      data: {
        sedeId,
        nombre,
        slug,
        descripcion: 'Bautismo de prueba de e2e (ya pasó).',
        tipo: 'bautismo',
        inicio,
        requiereInscripcion: true,
        creadoPorId: admin!.id,
      },
      select: { id: true },
    });
    return creado.id;
  }

  async function asignar(personaId: string, eventoId: string): Promise<void> {
    if (await prisma.solicitudBautismo.findFirst({ where: { personaId }, select: { id: true } })) return;
    const inscripcion = await prisma.inscripcionEvento.create({
      data: { eventoId, personaId, estado: 'confirmada', creadoPorId: admin!.id },
      select: { id: true },
    });
    await prisma.solicitudBautismo.create({
      data: { personaId, estado: 'aprobada', revisadoPorId: admin!.id, revisadaEn: new Date(Date.now() - 20 * 86_400_000), inscripcionEventoId: inscripcion.id },
    });
  }

  const paraLaWeb = await eventoPasado('e2e-bautismo-pasado-web', 'e2e-Bautismo pasado (web)');
  await asignar(await persona(EMAIL_BAUTISMO_CONFIRMANDO, 'Confirmanda', 'E2E Bautismo'), paraLaWeb);

  const paraConfirmar = await eventoPasado('e2e-bautismo-pasado-confirmar', 'e2e-Bautismo pasado para confirmar');
  const nombres = ['Abril', 'Bruno', 'Camila'];
  for (const [i, email] of EMAILS_BAUTISMO_A_CONFIRMAR.entries()) {
    await asignar(await persona(email, nombres[i], 'E2E Confirmar'), paraConfirmar);
  }
  console.log('sembrar-e2e 010: Eventos de bautismo pasados con asignadas listos.');
}
