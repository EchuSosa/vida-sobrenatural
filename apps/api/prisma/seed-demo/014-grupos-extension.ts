import type { DiaSemana, Genero } from '../../src/generated/prisma/enums.js';
import type { ContextoSeedDemo } from './contexto.js';

/**
 * spec 014 — su parte del seed demo (D120). Ocho Grupos de Extensión
 * FICTICIOS de La Plata: nombres, líderes y direcciones INVENTADOS (ninguno es
 * de una persona real), con coordenadas plausibles precargadas (así la demo no
 * depende de la red). Hay de mujeres, de varones y mixtos; uno "En la
 * iglesia"; distintos días (lunes a sábado, 18:30–19 hs y sábado 15 hs); uno
 * completo; uno con rango de edad; un pedido pendiente para la líder de demo.
 *
 * Para la demo (docs/23, módulo GEX): Florencia (`demo-nueva`, 27) busca y ve
 * los de mujeres y los mixtos de su edad; la líder de demo es Carolina Benítez
 * (`demo-gex-lider@example.com`), que lidera "Mujeres del centro" y tiene el
 * pedido de Sofía (`demo-vn-pendiente`) esperando. Idempotente por nombre y
 * por email.
 */

interface Lider {
  email: string;
  nombre: string;
  apellido: string;
  genero: Genero;
  edad: number;
  telefono: string;
}

interface GrupoDemo {
  nombre: string;
  lideres: Lider[];
  dias: DiaSemana[];
  horaInicio: string;
  cupo?: number;
  edadMinima?: number;
  edadMaxima?: number;
  enLaIglesia?: boolean;
  calle?: string;
  numero?: string;
  entre?: [string, string];
  zona?: string;
  latitud: number;
  longitud: number;
  /** Cuántas integrantes del volumen de demo se le suman (las del género y la edad del grupo). */
  integrantes: number;
}

const LIDER_DEMO: Lider = { email: 'demo-gex-lider@example.com', nombre: 'Carolina', apellido: 'Benítez', genero: 'femenino', edad: 42, telefono: '+54 9 221 640-0001' };

const GRUPOS: GrupoDemo[] = [
  {
    nombre: 'Mujeres del centro',
    lideres: [LIDER_DEMO],
    dias: ['martes'],
    horaInicio: '19:00',
    cupo: 12,
    calle: '7', numero: '1350', entre: ['58', '59'], zona: 'Centro',
    latitud: -34.9268, longitud: -57.9478,
    integrantes: 3,
  },
  {
    nombre: 'Mujeres de Tolosa',
    lideres: [{ email: 'demo-gex-silvia@example.com', nombre: 'Silvia', apellido: 'Quiroga', genero: 'femenino', edad: 55, telefono: '+54 9 221 640-0002' }],
    dias: ['jueves'],
    horaInicio: '18:30',
    calle: '528', numero: '1650', entre: ['2', '3'], zona: 'Tolosa',
    latitud: -34.8952, longitud: -57.9702,
    integrantes: 4,
  },
  {
    nombre: 'Mujeres de Gonnet',
    lideres: [{ email: 'demo-gex-paula@example.com', nombre: 'Paula', apellido: 'Godoy', genero: 'femenino', edad: 47, telefono: '+54 9 221 640-0003' }],
    dias: ['miercoles'],
    horaInicio: '18:30',
    cupo: 4,
    edadMinima: 30,
    calle: '15', numero: '1100', entre: ['501', '502'], zona: 'Gonnet',
    latitud: -34.8781, longitud: -58.0148,
    integrantes: 4, // completo
  },
  {
    nombre: 'Mujeres de Villa Elvira',
    lideres: [{ email: 'demo-gex-belen@example.com', nombre: 'Belén', apellido: 'Núñez', genero: 'femenino', edad: 61, telefono: '+54 9 221 640-0004' }],
    dias: ['sabado'],
    horaInicio: '15:00',
    edadMinima: 40,
    calle: '7', numero: '2350', entre: ['80', '81'], zona: 'Villa Elvira',
    latitud: -34.9497, longitud: -57.9232,
    integrantes: 2,
  },
  {
    nombre: 'Varones de Los Hornos',
    lideres: [{ email: 'demo-gex-hernan@example.com', nombre: 'Hernán', apellido: 'Coronel', genero: 'masculino', edad: 50, telefono: '+54 9 221 640-0005' }],
    dias: ['lunes'],
    horaInicio: '19:00',
    calle: '137', numero: '1840', entre: ['60', '61'], zona: 'Los Hornos',
    latitud: -34.9562, longitud: -57.9897,
    integrantes: 3,
  },
  {
    nombre: 'Varones del centro',
    lideres: [{ email: 'demo-gex-leandro@example.com', nombre: 'Leandro', apellido: 'Maldonado', genero: 'masculino', edad: 39, telefono: '+54 9 221 640-0006' }],
    dias: ['miercoles', 'viernes'],
    horaInicio: '19:00',
    calle: '50', numero: '920', entre: ['13', '14'], zona: 'Centro',
    latitud: -34.9151, longitud: -57.9612,
    integrantes: 2,
  },
  {
    nombre: 'Matrimonios de City Bell',
    lideres: [
      { email: 'demo-gex-natalia@example.com', nombre: 'Natalia', apellido: 'Ibáñez', genero: 'femenino', edad: 44, telefono: '+54 9 221 640-0007' },
      { email: 'demo-gex-federico@example.com', nombre: 'Federico', apellido: 'Ibáñez', genero: 'masculino', edad: 46, telefono: '+54 9 221 640-0008' },
    ],
    dias: ['viernes'],
    horaInicio: '19:00',
    calle: '13', numero: '420', entre: ['473', '474'], zona: 'City Bell',
    latitud: -34.8693, longitud: -58.0468,
    integrantes: 2,
  },
  {
    nombre: 'Jóvenes en la iglesia',
    lideres: [
      { email: 'demo-gex-ivana@example.com', nombre: 'Ivana', apellido: 'Escobar', genero: 'femenino', edad: 29, telefono: '+54 9 221 640-0009' },
      { email: 'demo-gex-agustin@example.com', nombre: 'Agustín', apellido: 'Escobar', genero: 'masculino', edad: 31, telefono: '+54 9 221 640-0010' },
    ],
    dias: ['sabado'],
    horaInicio: '15:00',
    edadMinima: 18,
    edadMaxima: 35,
    enLaIglesia: true,
    latitud: -34.9183, longitud: -57.9561,
    integrantes: 2,
  },
];

const nacidoHace = (anios: number) => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - anios);
  d.setMonth(2, 15);
  return d;
};

export async function sembrarDemo014(ctx: ContextoSeedDemo): Promise<void> {
  const { prisma, sedes } = ctx;
  if (await prisma.grupoExtension.count({ where: { nombre: { in: GRUPOS.map((g) => g.nombre) } } })) {
    console.log('seed-demo 014: los Grupos de Extensión ya existen, no se duplican.');
    return;
  }
  const admin = await prisma.persona.findFirst({ where: { rol: { has: 'admin' } }, orderBy: { createdAt: 'asc' }, select: { id: true } });
  if (!admin) throw new Error('seed-demo 014: falta un Admin (corré el elenco primero).');

  // Las personas que el elenco del manual usa para otras cosas no se suman a un grupo.
  const reservadas = (
    await prisma.persona.findMany({ where: { email: { in: ['demo-nueva@example.com', 'demo-vn-pendiente@example.com', 'demo-admin@example.com', 'demo-pastor@example.com'] } }, select: { id: true } })
  ).map((p) => p.id);
  const usadas = new Set<string>(reservadas);

  for (const g of GRUPOS) {
    const lideres: string[] = [];
    for (const l of g.lideres) {
      const existente = await prisma.persona.findUnique({ where: { email: l.email }, select: { id: true } });
      const id =
        existente?.id ??
        (
          await prisma.persona.create({
            data: {
              email: l.email,
              nombre: l.nombre,
              apellido: l.apellido,
              genero: l.genero,
              fechaNacimiento: nacidoHace(l.edad),
              telefono: l.telefono,
              direccion: 'Calle 12 N°1500, La Plata',
              sedeId: sedes.laPlata,
              estadoCivil: 'casado_a',
              profesion: 'educacion',
              congregaDesde: 2015,
              estado: 'activa',
              consentimientoDatos: true,
              consentimientoDatosFecha: new Date(),
              consentimientoDatosOrigen: 'app',
              rol: ['miembro_registrado', 'lider_extension'],
            },
            select: { id: true },
          })
        ).id;
      if (!existente) {
        await prisma.cambioDeRol.create({ data: { personaId: id, rol: 'lider_extension', accion: 'otorgado', origen: 'backoffice', realizadoPorId: admin.id } });
      }
      lideres.push(id);
      usadas.add(id);
    }

    const grupo = await prisma.grupoExtension.create({
      data: {
        nombre: g.nombre,
        dias: g.dias,
        horaInicio: g.horaInicio,
        cupo: g.cupo ?? null,
        edadMinima: g.edadMinima ?? null,
        edadMaxima: g.edadMaxima ?? null,
        enLaIglesia: !!g.enLaIglesia,
        sedeId: g.enLaIglesia ? sedes.laPlata : null,
        calle: g.calle ?? null,
        numero: g.numero ?? null,
        entreCalle1: g.entre?.[0] ?? null,
        entreCalle2: g.entre?.[1] ?? null,
        zona: g.zona ?? null,
        latitud: g.latitud,
        longitud: g.longitud,
        creadoPorId: admin.id,
        createdAt: new Date(Date.now() - 60 * 86_400_000),
        lideres: { create: lideres.map((personaId) => ({ personaId, desde: new Date(Date.now() - 60 * 86_400_000) })) },
      },
      select: { id: true },
    });

    // Integrantes: Personas de demo del género del grupo (o cualquiera si es mixto), en su rango de edad, sin otro grupo.
    const generos = new Set(g.lideres.map((l) => l.genero));
    const candidatas = await prisma.persona.findMany({
      where: {
        sedeId: sedes.laPlata,
        estado: 'activa',
        activo: true,
        // Las Personas "de volumen" del seed demo: así el elenco del manual queda libre para sus casos.
        email: { startsWith: 'demo-persona-' },
        id: { notIn: [...usadas] },
        ...(generos.size === 1 ? { genero: [...generos][0] } : {}),
        fechaNacimiento: {
          lte: nacidoHace(g.edadMinima ?? 18),
          ...(g.edadMaxima ? { gte: nacidoHace(g.edadMaxima + 1) } : {}),
        },
        solicitudesExtension: { none: { estado: { in: ['pendiente', 'aceptada'] } } },
      },
      orderBy: { email: 'asc' },
      take: g.integrantes,
      select: { id: true },
    });
    for (const [i, c] of candidatas.entries()) {
      const desde = new Date(Date.now() - (40 - i * 5) * 86_400_000);
      await prisma.solicitudGrupoExtension.create({
        data: { personaId: c.id, grupoId: grupo.id, estado: 'aceptada', revisadoPorId: lideres[0], revisadaEn: desde, createdAt: desde },
      });
      usadas.add(c.id);
    }
  }

  // El pedido pendiente que ve la líder de demo: Sofía quiere sumarse a "Mujeres del centro".
  const sofia = await prisma.persona.findUnique({ where: { email: 'demo-vn-pendiente@example.com' }, select: { id: true } });
  const centro = await prisma.grupoExtension.findFirst({ where: { nombre: 'Mujeres del centro' }, select: { id: true } });
  if (sofia && centro) {
    await prisma.solicitudGrupoExtension.create({
      data: { personaId: sofia.id, grupoId: centro.id, estado: 'pendiente', createdAt: new Date(Date.now() - 2 * 86_400_000) },
    });
  }
  console.log(`seed-demo 014: ${GRUPOS.length} Grupos de Extensión de demo, con integrantes y un pedido pendiente.`);
}
