import type { ContextoSembrarE2e } from './contexto.js';

/** El segundo Líder de curso de los e2e de la 008 (el primero es `e2e-lider-curso@`, del fixture general). */
export const EMAIL_LIDER_VS_2_E2E = 'e2e-lider-vs-2@example.com';

/**
 * spec 008, T010 — sus fixtures de e2e. Las ediciones, las Personas aptas y
 * las inscripciones las arma cada e2e por la API (crear edición como
 * e2e-admin, registrar Vida Nueva hecha, pedir y aprobar), así cada test
 * empieza de lo suyo. Acá solo el segundo Líder (SC-006: un Líder no ve la
 * edición de otro). Idempotente.
 */
export async function sembrarE2e008(ctx: ContextoSembrarE2e): Promise<void> {
  const existente = await ctx.prisma.persona.findUnique({ where: { email: EMAIL_LIDER_VS_2_E2E }, select: { id: true } });
  if (existente) return;
  await ctx.prisma.persona.create({
    data: {
      email: EMAIL_LIDER_VS_2_E2E,
      nombre: 'E2E',
      apellido: 'Líder VS 2',
      genero: 'masculino',
      fechaNacimiento: new Date('1985-03-10'),
      telefono: '+54 9 221 900-0008',
      direccion: 'Calle 7 y 50, La Plata',
      sedeId: ctx.sedeId,
      estadoCivil: 'casado_a',
      profesion: 'otro',
      profesionDetalle: 'Fixture de e2e',
      congregaDesde: 2015,
      estado: 'activa',
      consentimientoDatos: true,
      rol: ['miembro_registrado', 'lider_curso'],
    },
  });
}
