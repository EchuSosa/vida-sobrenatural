import type { ContextoSembrarE2e } from './contexto.js';

/**
 * spec 014 — fixtures de e2e (IMPLEMENTACION §2.10). Grupos `e2e-…` (que
 * `limpiar-e2e.ts` sabe borrar, con sus líderes y pedidos) y Personas
 * `e2e-gex-…`. Coordenadas precargadas: los e2e corren con el geocodificador
 * falso (`GEOCODIFICADOR=falso`), que ubica "7 nro 1200" en el centro.
 * Idempotente. Los e2e que cambian el estado de una persona la dejan como la
 * encuentran con `prepararSinGrupo` (helpers-014.ts).
 */
export const EMAILS_E2E_014 = {
  buscadora: 'e2e-gex-buscadora@example.com',
  buscadoraCelular: 'e2e-gex-buscadora-celular@example.com',
  lider: 'e2e-gex-lider@example.com',
  liderVaron: 'e2e-gex-lider-varon@example.com',
  integrante: 'e2e-gex-integrante@example.com',
  sumable: 'e2e-gex-sumable@example.com',
} as const;

export const GRUPOS_E2E_014 = {
  cerca: 'e2e-Mujeres del centro',
  lejos: 'e2e-Mujeres de City Bell',
  varones: 'e2e-Varones de Tolosa',
  completo: 'e2e-Grupo completo',
} as const;

const hace = (anios: number) => new Date(Date.now() - anios * 365.25 * 86_400_000);

export async function sembrarE2e014({ prisma, sedeId }: ContextoSembrarE2e): Promise<void> {
  async function persona(email: string, nombre: string, genero: 'femenino' | 'masculino', edad: number, rol: string[] = ['miembro_registrado']) {
    const existente = await prisma.persona.findUnique({ where: { email }, select: { id: true } });
    if (existente) return existente.id;
    const p = await prisma.persona.create({
      data: {
        email,
        nombre,
        apellido: 'E2E Gex',
        genero,
        fechaNacimiento: hace(edad),
        telefono: '+54 9 221 555-0140',
        direccion: 'Calle 1 N°100, La Plata',
        sedeId,
        estadoCivil: 'soltero_a',
        profesion: 'otro',
        congregaDesde: 2020,
        estado: 'activa',
        consentimientoDatos: true,
        rol,
      },
      select: { id: true },
    });
    return p.id;
  }
  const lider = await persona(EMAILS_E2E_014.lider, 'Lidia', 'femenino', 45, ['miembro_registrado', 'lider_extension']);
  const liderVaron = await persona(EMAILS_E2E_014.liderVaron, 'Leo', 'masculino', 45, ['miembro_registrado', 'lider_extension']);
  await persona(EMAILS_E2E_014.buscadora, 'Bea', 'femenino', 30);
  await persona(EMAILS_E2E_014.buscadoraCelular, 'Celia', 'femenino', 30);
  await persona(EMAILS_E2E_014.sumable, 'Sumi', 'femenino', 33);
  const integrante = await persona(EMAILS_E2E_014.integrante, 'Ines', 'femenino', 40);
  const admin = await prisma.persona.findFirst({ where: { email: 'e2e-admin@example.com' }, select: { id: true } });
  const creadoPorId = admin?.id ?? lider;

  async function grupo(nombre: string, liderId: string, datos: { dias: Array<'lunes' | 'martes' | 'jueves' | 'sabado'>; latitud: number; longitud: number; zona: string; cupo?: number }) {
    const existente = await prisma.grupoExtension.findFirst({ where: { nombre }, select: { id: true } });
    if (existente) return existente.id;
    const g = await prisma.grupoExtension.create({
      data: {
        nombre,
        dias: datos.dias,
        horaInicio: '19:00',
        cupo: datos.cupo ?? null,
        calle: '64',
        numero: '820',
        entreCalle1: '11',
        entreCalle2: '12',
        zona: datos.zona,
        latitud: datos.latitud,
        longitud: datos.longitud,
        creadoPorId,
        lideres: { create: [{ personaId: liderId }] },
      },
      select: { id: true },
    });
    return g.id;
  }
  await grupo(GRUPOS_E2E_014.cerca, lider, { dias: ['martes'], latitud: -34.925, longitud: -57.95, zona: 'Centro' });
  await grupo(GRUPOS_E2E_014.lejos, lider, { dias: ['jueves'], latitud: -34.8693, longitud: -58.0468, zona: 'City Bell' });
  await grupo(GRUPOS_E2E_014.varones, liderVaron, { dias: ['lunes'], latitud: -34.8952, longitud: -57.9702, zona: 'Tolosa' });
  const completo = await grupo(GRUPOS_E2E_014.completo, lider, { dias: ['sabado'], latitud: -34.93, longitud: -57.96, zona: 'Centro', cupo: 1 });
  if (!(await prisma.solicitudGrupoExtension.count({ where: { personaId: integrante, estado: 'aceptada' } }))) {
    await prisma.solicitudGrupoExtension.create({ data: { personaId: integrante, grupoId: completo, estado: 'aceptada', revisadoPorId: lider, revisadaEn: new Date() } });
  }
}
