import type { ContextoSeedDemo } from './contexto.js';

/**
 * spec 016 (D244) — datos de demo de los líderes de Ministerio: Rocío
 * (`demo-ministerio-lider@example.com`) lidera el Ministerio de Bienvenida,
 * que ya tiene integrantes de la 009 y la 015 (Seguridad y Consolidadores),
 * para probar "Mi ministerio" en la app. Ceremonial queda sin líder, para
 * ver "Sin líder" en la lista del backoffice y asignarle uno en LMI-01.
 * Idempotente. Nombre inventado (nunca datos reales de líderes).
 */
export async function sembrarDemo016({ prisma, sedes }: ContextoSeedDemo): Promise<void> {
  const bienvenida = await prisma.ministerio.findFirst({ where: { nombre: 'Ministerio de Bienvenida', eliminadoEn: null }, select: { id: true } });
  const admin = await prisma.persona.findUnique({ where: { email: 'demo-admin@example.com' }, select: { id: true } });
  if (!bienvenida || !admin) return;

  const email = 'demo-ministerio-lider@example.com';
  let lider = await prisma.persona.findUnique({ where: { email }, select: { id: true } });
  if (!lider) {
    lider = await prisma.persona.create({
      data: {
        email,
        nombre: 'Rocío',
        apellido: 'Villalba',
        telefono: '+54 9 221 820-0016',
        sedeId: sedes.laPlata,
        estadoCivil: 'casado_a',
        profesion: 'otro',
        profesionDetalle: 'Demostración',
        congregaDesde: 2012,
        fechaNacimiento: new Date('1979-11-23'),
        genero: 'femenino',
        direccion: 'Calle 13 N°845, La Plata',
        estado: 'activa',
        activo: true,
        consentimientoDatos: true,
        rol: ['miembro_registrado', 'apto_ministerio', 'miembro_ministerio', 'lider_ministerio'],
      },
      select: { id: true },
    });
    // Sirve en Bienvenida (Atención de la Casa) además de liderarlo.
    const atencion = await prisma.celula.findFirst({ where: { ministerioId: bienvenida.id, nombre: 'Atención de la Casa', eliminadoEn: null }, select: { id: true } });
    await prisma.postulacion.create({
      data: { personaId: lider.id, ministerioId: bienvenida.id, celulaId: atencion?.id ?? null, estado: 'aprobada', revisadoPorId: admin.id, revisadaEn: new Date('2024-03-10') },
    });
  }
  if (!(await prisma.liderMinisterio.findFirst({ where: { ministerioId: bienvenida.id, personaId: lider.id, hasta: null }, select: { id: true } }))) {
    await prisma.liderMinisterio.create({ data: { ministerioId: bienvenida.id, personaId: lider.id, asignadoPorId: admin.id, desde: new Date('2025-02-01') } });
  }
  await prisma.$executeRaw`UPDATE "personas" SET "rol" = array_append("rol", 'lider_ministerio'::text) WHERE "id" = ${lider.id} AND NOT ('lider_ministerio'::text = ANY("rol"))`;
  console.log('seed-demo 016: Rocío lidera el Ministerio de Bienvenida.');
}
