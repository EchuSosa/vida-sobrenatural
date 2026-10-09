import type { ContextoSeedDemo } from './contexto.js';

/**
 * spec 009 — su parte del seed demo (D120, FR-040, T015).
 *
 * Los doce Ministerios REALES de `docs/22-ministerios.md` (aportados por Echu
 * el 2026-10-08), con sus áreas como Células, su "línea pública" (provisoria,
 * D98: la iglesia la revisa) y si requieren formación. "Discipulados Vida
 * Nueva" ofrece el rol `discipulador` al aprobar. Donde docs/22 no trae una
 * descripción del Ministerio (solo áreas), la descripción repite su línea
 * pública. El listado se mantiene desde el backoffice, no desde acá.
 *
 * Además, para ver todos los estados (FR-040): un Ministerio inactivo y uno en
 * la papelera (con nombres hostiles: al máximo, con tildes y ñ), una Célula
 * inactiva, y Postulaciones en los cinco estados, un cambio de Ministerio,
 * una baja, una en nombre de, y una motivación de 500 caracteres. Personas
 * `demo-…` de quickstart.md. Mientras la 008 no esté, `apto_ministerio` se da
 * acá a mano (provisorio). Idempotente por nombre y por email.
 */

interface Area {
  nombre: string;
  descripcion?: string;
  ofreceRolDiscipulador?: boolean;
}

interface MinisterioReal {
  nombre: string;
  lineaPublica: string;
  descripcion: string;
  requiereFormacion: boolean;
  areas: Area[];
}

export const MINISTERIOS_REALES: MinisterioReal[] = [
  // --- Para empezar a servir ya ---
  {
    nombre: 'Ministerio de Bienvenida',
    lineaPublica: 'Recibimos y acompañamos a cada persona que llega.',
    descripcion: 'Recibimos y acompañamos a cada persona que llega.',
    requiereFormacion: false,
    areas: [
      {
        nombre: 'Atención de la Casa',
        descripcion:
          'Colaboran recibiendo y guiando a las personas tanto en las puertas de ingreso como en diferentes sectores del templo, o en otras tareas que requieren las reuniones de Vida Sobrenatural.',
      },
      {
        nombre: 'Seguridad',
        descripcion: 'Cuidado de los accesos del templo.',
      },
      {
        nombre: 'Consolidadores',
        descripcion:
          'Toman datos de las personas nuevas que recibieron a Cristo. Realizan también seguimiento, apoyo y conexión de los nuevos con los grupos de extensión y la vida de la iglesia.',
      },
    ],
  },
  {
    nombre: 'Ministerio Ceremonial',
    lineaPublica:
      'Organizamos las Santas Cenas y atendemos a invitados y colaboradores.',
    descripcion:
      'Armado y organización de las Santas Cenas, atención de invitados y colaboradores.',
    requiereFormacion: false,
    areas: [],
  },
  {
    nombre: 'Ministerio Vida en acción',
    lineaPublica: 'Servimos a quienes más lo necesitan.',
    descripcion: 'Servimos a quienes más lo necesitan.',
    requiereFormacion: false,
    areas: [
      { nombre: 'Visitas y ayuda a necesitados' },
      {
        nombre: 'Proyecto Somos Familia',
        descripcion: 'Barrio el Mercadito, días sábados.',
      },
      {
        nombre: 'Proyecto Vidas',
        descripcion: 'Asistencia y acompañamiento a embarazos vulnerables.',
      },
      {
        nombre: 'Proyecto Sembrando vida',
        descripcion: 'Atención y servicio a gente en situación de calle.',
      },
      {
        nombre: 'Grupo Hospitales',
        descripcion: 'Visitas, acompañamiento y evangelización en hospitales.',
      },
    ],
  },
  {
    nombre: 'Actividades especiales',
    lineaPublica: 'Hacemos posibles los eventos de la iglesia.',
    descripcion: 'Hacemos posibles los eventos de la iglesia.',
    requiereFormacion: false,
    areas: [
      { nombre: 'Cuidado de niños en actividades especiales' },
      { nombre: 'Armado y desarmado en eventos' },
      { nombre: 'Decoración y escenografía' },
    ],
  },
  {
    nombre: 'Mesa de entrada',
    lineaPublica: 'Informes, inscripciones y materiales de Ediciones VS.',
    descripcion:
      'Mesa de informes, inscripciones y venta de materiales de Ediciones VS.',
    requiereFormacion: false,
    areas: [],
  },
  {
    nombre: 'Adultos 6.0',
    lineaPublica: 'Acompañamos al grupo de adultos mayores.',
    descripcion:
      'Colaboración en el grupo de adultos mayores (conexión, actividades y servicio).',
    requiereFormacion: false,
    areas: [],
  },
  // --- Requieren formación previa ---
  {
    nombre: 'Ministerio de Niños',
    lineaPublica: 'Escuela bíblica para chicos de preescolar y primaria.',
    descripcion: 'Escuela bíblica en edad preescolar y primaria.',
    requiereFormacion: true,
    areas: [],
  },
  {
    nombre: 'Ministerio Enseñanza',
    lineaPublica: 'Acompañamos a quienes empiezan su camino.',
    descripcion: 'Acompañamos a quienes empiezan su camino.',
    requiereFormacion: true,
    areas: [
      {
        nombre: 'Discipulados Vida Nueva',
        descripcion:
          'Acompañar semanalmente y durante tres meses a una persona nueva brindándole nuestro curso "Vida Nueva". Las capacitaciones para dar el curso se realizan periódicamente. Este servicio se puede desarrollar en paralelo con cualquier ministerio.',
        ofreceRolDiscipulador: true,
      },
    ],
  },
  {
    nombre: 'Adoración',
    lineaPublica: 'Música y sonido en cada reunión.',
    descripcion:
      'Se realizan audiciones para músicos y voces, y se brinda capacitación para sonido.',
    requiereFormacion: true,
    areas: [{ nombre: 'Músicos' }, { nombre: 'Voces' }, { nombre: 'Sonido' }],
  },
  {
    nombre: 'Multimedia',
    lineaPublica: 'Pantalla, luces y cámaras en las reuniones.',
    descripcion:
      'Operación de pantalla, luces y cámaras durante las reuniones.',
    requiereFormacion: true,
    areas: [],
  },
  {
    nombre: 'Redes Sociales',
    lineaPublica: 'Contamos lo que pasa en la iglesia con fotos y videos.',
    descripcion:
      'Cobertura de reuniones y eventos de Vida Sobrenatural a través de fotografía, videos y edición.',
    requiereFormacion: true,
    areas: [],
  },
  {
    nombre: 'Intercesión',
    lineaPublica: 'Oramos por otros y por la extensión del Reino.',
    descripcion: 'Clamor a favor de otros y de la extensión del Reino.',
    requiereFormacion: true,
    areas: [],
  },
];

export async function sembrarDemo009(ctx: ContextoSeedDemo): Promise<void> {
  const { prisma, sedes } = ctx;
  const admin = await prisma.persona.findFirst({
    where: { rol: { has: 'admin' } },
    select: { id: true },
  });

  async function ministerio(
    datos: Omit<MinisterioReal, 'areas'> & {
      activo?: boolean;
      eliminado?: boolean;
    },
    areas: Array<Area & { activo?: boolean }>,
  ) {
    const existente = await prisma.ministerio.findFirst({
      where: { nombre: datos.nombre },
      select: { id: true },
    });
    const { eliminado, ...campos } = datos;
    const m =
      existente ??
      (await prisma.ministerio.create({
        data: {
          ...campos,
          ...(eliminado
            ? {
                eliminadoEn: new Date('2026-09-20T15:00:00Z'),
                eliminadoPor: admin?.id ?? null,
              }
            : {}),
        },
        select: { id: true },
      }));
    const celulas: Record<string, string> = {};
    for (const area of areas) {
      const previa = await prisma.celula.findFirst({
        where: { ministerioId: m.id, nombre: area.nombre },
        select: { id: true },
      });
      celulas[area.nombre] = (
        previa ??
        (await prisma.celula.create({
          data: { ministerioId: m.id, ...area },
          select: { id: true },
        }))
      ).id;
    }
    return { id: m.id, celulas, nuevo: !existente };
  }

  const reales: Record<
    string,
    { id: string; celulas: Record<string, string> }
  > = {};
  for (const { areas, ...datos } of MINISTERIOS_REALES)
    reales[datos.nombre] = await ministerio(datos, areas);

  // FR-040: un inactivo (nombre al máximo, con tildes y ñ, y una Célula inactiva) y uno en la papelera.
  await ministerio(
    {
      nombre:
        'Ministerio de Acompañamiento a Niñas, Niños y Señoras Mayores en Situación de Ñ',
      lineaPublica:
        'Provisorio de demostración: un Ministerio inactivo, con el nombre al máximo.',
      descripcion:
        'Ministerio de demostración (D120): está inactivo, así que no se ofrece en la app ni en la web pública.',
      requiereFormacion: false,
      activo: false,
    },
    [
      {
        nombre:
          'Célula de Acompañamiento Telefónico a Señoras y Señores Mayores en Barrio Ñandú',
        activo: false,
      },
    ],
  );
  await ministerio(
    {
      nombre: 'Coro de prueba (eliminado)',
      lineaPublica: 'Provisorio de demostración: está en la papelera.',
      descripcion:
        'Ministerio de demostración (D120): cargado por error y eliminado; se ve en la papelera.',
      requiereFormacion: true,
      eliminado: true,
    },
    [],
  );

  const APTA = ['miembro_registrado', 'apto_ministerio'];
  const comunes = {
    sedeId: sedes.laPlata,
    estadoCivil: 'soltero_a' as const,
    profesion: 'otro' as const,
    profesionDetalle: 'Demostración',
    congregaDesde: 2018,
    fechaNacimiento: new Date('1988-07-09'),
    genero: 'femenino' as const,
    direccion: 'Calle 13 N°845, La Plata',
    estado: 'activa' as const,
    activo: true,
    consentimientoDatos: true,
  };
  async function persona(
    email: string | null,
    nombre: string,
    apellido: string,
    telefono: string,
    rol: string[],
  ) {
    const existente = email
      ? await prisma.persona.findUnique({
          where: { email },
          select: { id: true },
        })
      : await prisma.persona.findFirst({
          where: { email: null, nombre, apellido },
          select: { id: true },
        });
    if (existente) return { id: existente.id, nueva: false };
    const creada = await prisma.persona.create({
      data: { ...comunes, email, nombre, apellido, telefono, rol },
      select: { id: true },
    });
    if (rol.includes('apto_ministerio') && admin) {
      // Vida de Servicio hecha (D160): así la card de Ministerio está habilitada, como en la vida real.
      await prisma.completitudManual.create({
        data: {
          personaId: creada.id,
          etapa: 'vida_de_servicio',
          origen: 'admin',
          nota: 'Demostración (spec 009)',
          registradaPorId: admin.id,
        },
      });
    }
    return { id: creada.id, nueva: true };
  }
  const revisor = (personaId: string) => admin?.id ?? personaId;
  const hace = (dias: number) =>
    new Date(Date.now() - dias * 24 * 60 * 60 * 1000);

  const bienvenida = reales['Ministerio de Bienvenida'];
  const vidaEnAccion = reales['Ministerio Vida en acción'];
  const adoracion = reales['Adoración'];
  const ensenanza = reales['Ministerio Enseñanza'];
  const mesa = reales['Mesa de entrada'];

  await persona(
    'demo-no-apta@example.com',
    'Nora',
    'Aguirre',
    '+54 9 221 820-0001',
    ['miembro_registrado'],
  );
  await persona(
    'demo-apta@example.com',
    'Valentina',
    'Rossi',
    '+54 9 221 820-0002',
    APTA,
  );

  const miembro = await persona(
    'demo-miembro@example.com',
    'Martín',
    'Sosa Echeverría',
    '+54 9 221 820-0003',
    [...APTA, 'miembro_ministerio'],
  );
  if (miembro.nueva) {
    await prisma.postulacion.create({
      data: {
        personaId: miembro.id,
        ministerioId: vidaEnAccion.id,
        celulaId: vidaEnAccion.celulas['Proyecto Somos Familia'],
        estado: 'aprobada',
        motivacion: 'Quiero ayudar los sábados en el Mercadito.',
        revisadoPorId: revisor(miembro.id),
        revisadaEn: hace(60),
        createdAt: hace(65),
      },
    });
  }

  // Pendiente con motivación al máximo (500), a un Ministerio que requiere formación.
  const pendiente = await persona(
    'demo-ministerio-pendiente@example.com',
    'María José',
    'Ñáñez de la Fuente',
    '+54 9 221 820-0004',
    APTA,
  );
  if (pendiente.nueva) {
    const base =
      'Canto desde chica en el coro de mi barrio y me encantaría poner mi voz al servicio de la iglesia. Tengo disponibilidad los domingos y puedo ensayar los jueves a la noche. Estudié un poco de técnica vocal y toco algo de guitarra. ';
    await prisma.postulacion.create({
      data: {
        personaId: pendiente.id,
        ministerioId: adoracion.id,
        celulaId: adoracion.celulas['Voces'],
        motivacion: base.repeat(3).slice(0, 500),
        disponibilidad: 'Domingos y jueves a la noche.',
        requiereFormacion: true,
        createdAt: hace(3),
      },
    });
  }

  // Rechazada (con motivo interno) y retirada.
  const rechazada = await persona(
    'demo-ministerio-rechazada@example.com',
    'Lucas',
    'Benítez',
    '+54 9 221 820-0005',
    APTA,
  );
  if (rechazada.nueva) {
    await prisma.postulacion.create({
      data: {
        personaId: rechazada.id,
        ministerioId: mesa.id,
        estado: 'rechazada',
        revisadoPorId: revisor(rechazada.id),
        revisadaEn: hace(10),
        motivoRechazo:
          'Hoy el equipo de Mesa de entrada está completo; le propusimos Bienvenida.',
        createdAt: hace(15),
      },
    });
  }
  const retirada = await persona(
    'demo-ministerio-retirada@example.com',
    'Sofía',
    'Quiroga',
    '+54 9 221 820-0006',
    APTA,
  );
  if (retirada.nueva) {
    await prisma.postulacion.create({
      data: {
        personaId: retirada.id,
        ministerioId: bienvenida.id,
        estado: 'retirada',
        retiradaEn: hace(5),
        createdAt: hace(8),
      },
    });
  }

  // Cambió de Ministerio: la vieja inactiva por cambio, la nueva aprobada.
  const cambio = await persona(
    'demo-ministerio-cambio@example.com',
    'Gonzalo',
    'Paz Ibáñez',
    '+54 9 221 820-0007',
    [...APTA, 'miembro_ministerio'],
  );
  if (cambio.nueva) {
    const nueva = await prisma.postulacion.create({
      data: {
        personaId: cambio.id,
        // D217: "Discipulados Vida Nueva" se sirve en paralelo, no es un cambio.
        ministerioId: adoracion.id,
        celulaId: adoracion.celulas['Sonido'],
        estado: 'aprobada',
        requiereFormacion: true,
        revisadoPorId: revisor(cambio.id),
        revisadaEn: hace(20),
        createdAt: hace(25),
      },
      select: { id: true },
    });
    await prisma.postulacion.create({
      data: {
        personaId: cambio.id,
        ministerioId: bienvenida.id,
        celulaId: bienvenida.celulas['Seguridad'],
        estado: 'inactiva',
        motivoInactivacion: 'cambio_de_ministerio',
        reemplazadaPorId: nueva.id,
        revisadoPorId: revisor(cambio.id),
        revisadaEn: hace(200),
        inactivadaEn: hace(20),
        inactivadaPorId: revisor(cambio.id),
        createdAt: hace(210),
      },
    });
    // D217: además sirve en "Discipulados Vida Nueva", en paralelo con Adoración.
    await prisma.postulacion.create({
      data: {
        personaId: cambio.id,
        ministerioId: ensenanza.id,
        celulaId: ensenanza.celulas['Discipulados Vida Nueva'],
        estado: 'aprobada',
        enParalelo: true,
        requiereFormacion: true,
        revisadoPorId: revisor(cambio.id),
        revisadaEn: hace(10),
        createdAt: hace(12),
      },
    });
  }

  // Dada de baja.
  const baja = await persona(
    'demo-ministerio-baja@example.com',
    'Carla',
    'Domínguez',
    '+54 9 221 820-0008',
    [...APTA, 'miembro_ministerio'],
  );
  if (baja.nueva) {
    await prisma.postulacion.create({
      data: {
        personaId: baja.id,
        ministerioId: vidaEnAccion.id,
        celulaId: vidaEnAccion.celulas['Grupo Hospitales'],
        estado: 'inactiva',
        motivoInactivacion: 'baja',
        motivoBaja: 'Se mudó a Mar del Plata.',
        revisadoPorId: revisor(baja.id),
        revisadaEn: hace(120),
        inactivadaEn: hace(12),
        inactivadaPorId: revisor(baja.id),
        createdAt: hace(130),
      },
    });
  }

  // Sin email (sin acceso a la app), apta: para "Postular en nombre de" (Historia 5); y una ya creada en su nombre.
  await persona(null, 'Rosa', 'Medina (sin email)', '+54 9 221 820-0009', APTA);
  const enNombre = await persona(
    null,
    'Héctor',
    'Villalba (sin email)',
    '+54 9 221 820-0010',
    APTA,
  );
  if (enNombre.nueva && admin) {
    await prisma.postulacion.create({
      data: {
        personaId: enNombre.id,
        ministerioId: reales['Adultos 6.0'].id,
        creadoPorId: admin.id,
        disponibilidad: 'Martes a la tarde.',
        createdAt: hace(1),
      },
    });
  }
}
