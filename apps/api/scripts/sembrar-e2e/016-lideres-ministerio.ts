import type { ContextoSembrarE2e } from './contexto.js';

/**
 * spec 016 (D244): una líder de e2e-Bienvenida (la del 009, con sus áreas y
 * su miembro en Seguridad) para "Mi ministerio" en la web, y una persona
 * para que el Admin la asigne desde el backoffice. Idempotente: el backoffice
 * la quita y la vuelve a asignar en el mismo test.
 */
export const EMAILS_E2E_016 = {
  lider: 'e2e-lider-ministerio@example.com',
  liderCelular: 'e2e-lider-ministerio-celular@example.com',
  paraAsignar: 'e2e-lider-ministerio-nueva@example.com',
} as const;

export async function sembrarE2e016({ prisma, sedeId }: ContextoSembrarE2e): Promise<void> {
  async function persona(email: string, nombre: string, rol: string[]) {
    const existente = await prisma.persona.findUnique({ where: { email }, select: { id: true } });
    if (existente) return existente.id;
    const p = await prisma.persona.create({
      data: {
        email,
        nombre,
        apellido: 'E2E Líder',
        genero: 'femenino',
        fechaNacimiento: new Date('1985-08-02'),
        telefono: '+54 9 221 555-0160',
        direccion: 'Calle 1 N°100, La Plata',
        sedeId,
        estadoCivil: 'soltero_a',
        profesion: 'otro',
        congregaDesde: 2015,
        estado: 'activa',
        consentimientoDatos: true,
        rol,
      },
      select: { id: true },
    });
    return p.id;
  }
  const bienvenida = await prisma.ministerio.findFirst({ where: { nombre: 'e2e-Bienvenida', eliminadoEn: null }, select: { id: true } });
  if (!bienvenida) throw new Error('sembrar-e2e 016: falta e2e-Bienvenida (sembrarE2e009 va antes).');
  const admin = await prisma.persona.findUniqueOrThrow({ where: { email: 'e2e-admin@example.com' }, select: { id: true } });
  await persona(EMAILS_E2E_016.paraAsignar, 'Nora', ['miembro_registrado']);
  for (const [email, nombre] of [
    [EMAILS_E2E_016.lider, 'Lidia'],
    [EMAILS_E2E_016.liderCelular, 'Lía'],
  ] as const) {
    const id = await persona(email, nombre, ['miembro_registrado', 'lider_ministerio']);
    if (!(await prisma.liderMinisterio.findFirst({ where: { ministerioId: bienvenida.id, personaId: id, hasta: null }, select: { id: true } }))) {
      await prisma.liderMinisterio.create({ data: { ministerioId: bienvenida.id, personaId: id, asignadoPorId: admin.id } });
    }
    // El rol, por si la Persona ya existía de una corrida anterior sin él.
    await prisma.$executeRaw`UPDATE "personas" SET "rol" = array_append("rol", 'lider_ministerio'::text) WHERE "id" = ${id} AND NOT ('lider_ministerio'::text = ANY("rol"))`;
  }
}
