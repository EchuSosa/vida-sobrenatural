import type { ContextoSembrarE2e } from './contexto.js';

/**
 * spec 009, T014 — fixtures de e2e (IMPLEMENTACION §2.10). Ministerios `e2e-…`
 * (que `limpiar-e2e.ts` ya sabe borrar, con sus Células y Postulaciones) y
 * Personas `e2e-ministerio-…`. Mientras la 008 no esté, el rol de estado
 * `apto_ministerio` se da acá a mano (IMPLEMENTACION §4, 009). Idempotente.
 *
 * Los e2e que cambian el estado de una Persona la dejan como la encuentran
 * con `prepararPersonaMinisterio` (helpers-009.ts), porque los proyectos de
 * Playwright (escritorio y celular) y los reintentos comparten estas filas.
 */
export const EMAILS_E2E_009 = {
  apta: 'e2e-ministerio-apta@example.com',
  aptaCelular: 'e2e-ministerio-apta-celular@example.com',
  noApta: 'e2e-ministerio-no-apta@example.com',
  miembro: 'e2e-ministerio-miembro@example.com',
  postulante: 'e2e-ministerio-postulante@example.com',
  postulanteCambio: 'e2e-ministerio-cambio@example.com',
} as const;

const APTA = ['miembro_registrado', 'apto_ministerio'];

export async function sembrarE2e009({
  prisma,
  sedeId,
}: ContextoSembrarE2e): Promise<void> {
  async function ministerio(
    nombre: string,
    datos: {
      descripcion: string;
      lineaPublica: string;
      requiereFormacion?: boolean;
      activo?: boolean;
    },
    celulas: Array<{
      nombre: string;
      descripcion?: string;
      ofreceRolDiscipulador?: boolean;
    }>,
  ) {
    const existente = await prisma.ministerio.findFirst({
      where: { nombre },
      select: { id: true },
    });
    const m =
      existente ??
      (await prisma.ministerio.create({
        data: { nombre, ...datos },
        select: { id: true },
      }));
    const ids: Record<string, string> = {};
    for (const c of celulas) {
      const previa = await prisma.celula.findFirst({
        where: { ministerioId: m.id, nombre: c.nombre },
        select: { id: true },
      });
      ids[c.nombre] = (
        previa ??
        (await prisma.celula.create({
          data: { ministerioId: m.id, ...c },
          select: { id: true },
        }))
      ).id;
    }
    return { id: m.id, celulas: ids };
  }

  const admin = await prisma.persona.findUniqueOrThrow({
    where: { email: 'e2e-admin@example.com' },
    select: { id: true },
  });

  /**
   * Una apta tiene Vida de Servicio hecha (D159/D160): mientras la 008 no la
   * complete por el sistema, una Completitud Manual — así la card de Mi camino
   * está habilitada, como en la vida real.
   */
  async function persona(
    email: string,
    nombre: string,
    rol: string[],
  ): Promise<string> {
    const existente = await prisma.persona.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existente) return existente.id;
    const creada = await prisma.persona.create({
      data: {
        email,
        nombre,
        apellido: 'E2E Ministerio',
        genero: 'femenino',
        fechaNacimiento: new Date('1990-01-01'),
        telefono: '+54 9 221 900-0009',
        direccion: 'Calle 50 y 15, La Plata',
        sedeId,
        estadoCivil: 'soltero_a',
        profesion: 'otro',
        profesionDetalle: 'Fixture de e2e',
        congregaDesde: 2020,
        estado: 'activa',
        activo: true,
        consentimientoDatos: true,
        rol,
      },
      select: { id: true },
    });
    if (rol.includes('apto_ministerio')) {
      await prisma.completitudManual.create({
        data: {
          personaId: creada.id,
          etapa: 'vida_de_servicio',
          origen: 'admin',
          nota: 'Fixture de e2e (spec 009)',
          registradaPorId: admin.id,
        },
      });
    }
    return creada.id;
  }

  const bienvenida = await ministerio(
    'e2e-Bienvenida',
    {
      descripcion: 'Recibimos y acompañamos a cada persona que llega.',
      lineaPublica: 'Recibimos y acompañamos a cada persona que llega.',
    },
    [
      {
        nombre: 'Atención de la Casa',
        descripcion:
          'Reciben y guían a las personas en las puertas y en el templo.',
      },
      {
        nombre: 'Seguridad',
        descripcion: 'Cuidado de los accesos del templo.',
      },
    ],
  );
  await ministerio(
    'e2e-Adoración',
    {
      descripcion:
        'Se realizan audiciones para músicos y voces, y se brinda capacitación para sonido.',
      lineaPublica: 'Música y sonido en cada reunión.',
      requiereFormacion: true,
    },
    [{ nombre: 'Voces' }, { nombre: 'Sonido' }],
  );
  await ministerio(
    'e2e-Enseñanza',
    {
      descripcion: 'Acompañamos a quienes empiezan su camino.',
      lineaPublica: 'Acompañamos a quienes empiezan su camino.',
      requiereFormacion: true,
    },
    [
      {
        nombre: 'Discipulados Vida Nueva',
        descripcion: 'Acompañar a una persona nueva con el curso "Vida Nueva".',
        ofreceRolDiscipulador: true,
      },
    ],
  );
  await ministerio(
    'e2e-Mesa de entrada',
    {
      descripcion: 'Informes, inscripciones y materiales.',
      lineaPublica: 'Informes, inscripciones y materiales de Ediciones VS.',
    },
    [],
  );
  await ministerio(
    'e2e-Pausado',
    {
      descripcion: 'Un Ministerio inactivo: no se ofrece.',
      lineaPublica: 'No se tiene que ver.',
      activo: false,
    },
    [],
  );

  await persona(EMAILS_E2E_009.apta, 'Apta', APTA);
  await persona(EMAILS_E2E_009.aptaCelular, 'AptaCelular', APTA);
  await persona(EMAILS_E2E_009.noApta, 'NoApta', ['miembro_registrado']);
  await persona(EMAILS_E2E_009.postulante, 'Postulante', APTA);
  await persona(EMAILS_E2E_009.postulanteCambio, 'Cambio', APTA);
  const miembro = await persona(EMAILS_E2E_009.miembro, 'Miembro', [
    ...APTA,
    'miembro_ministerio',
  ]);
  if (
    !(await prisma.postulacion.findFirst({
      where: { personaId: miembro, estado: 'aprobada' },
      select: { id: true },
    }))
  ) {
    await prisma.postulacion.create({
      data: {
        personaId: miembro,
        ministerioId: bienvenida.id,
        celulaId: bienvenida.celulas.Seguridad,
        estado: 'aprobada',
        revisadaEn: new Date(),
      },
    });
  }
}
