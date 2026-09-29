import { Test } from '@nestjs/testing';
import type { Franja } from '@vida-sobrenatural/shared-types';
import { SolicitudDiscipuladoService } from '../../src/solicitud-discipulado/solicitud-discipulado.service.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import { CruceService } from '../../src/discipulado/cruce.service.js';
import { EventosDiscipuladoService } from '../../src/discipulado/eventos.js';
import { AppException } from '../../src/common/errors/app-exception.js';

/**
 * specs/004, lote A: un Prisma en memoria con SOLO lo que usa
 * SolicitudDiscipuladoService, para que los unit tests (T015, T016a, T023)
 * se lean como las transiciones del diagrama de data-model.md y no como una
 * lista de mocks. Las garantías de la base (índices parciales, bloqueos) las
 * prueba el test de integración (T018), no este.
 */

export interface PersonaFake {
  id: string;
  activo?: boolean;
  estado?: 'activa' | 'pendiente_tutor';
  fechaNacimiento?: Date;
  genero?: string;
  nombre?: string;
  apellido?: string;
  telefono?: string;
}

export interface SolicitudFake {
  id: string;
  personaId: string;
  estado: 'pendiente' | 'propuesta' | 'aprobada' | 'rechazada' | 'retirada';
  creadoPorId: string | null;
  revisadoPorId: string | null;
  revisadaEn: Date | null;
  createdAt: Date;
}

export interface PropuestaFake {
  id: string;
  tipo: 'nueva' | 'reasignacion';
  solicitudId: string;
  discipuladorId: string;
  grupoDestinoId: string | null;
  propuestaPorId: string;
  propuestaEn: Date;
  estado: 'pendiente' | 'aceptada' | 'declinada' | 'retirada';
  retiradaPor: 'admin' | 'persona' | null;
  respondidaEn: Date | null;
  motivoDeclinacion: string | null;
}

export interface InscripcionFake {
  personaId: string;
  grupoId: string;
  solicitudId: string;
  estado: 'activa' | 'completada' | 'abandono' | 'dada_de_baja';
  createdAt: Date;
  cerradaEn: Date | null;
}

export interface Base {
  personas: PersonaFake[];
  solicitudes: SolicitudFake[];
  franjas: Array<Franja & { solicitudId: string }>;
  propuestas: PropuestaFake[];
  inscripciones: InscripcionFake[];
  liderazgos: Array<{ grupoId: string; personaId: string; hasta: Date | null }>;
}

export const ADULTA = new Date('1985-06-15T00:00:00Z');

export function haceAnios(anios: number): Date {
  const fecha = new Date();
  fecha.setUTCFullYear(fecha.getUTCFullYear() - anios);
  fecha.setUTCDate(fecha.getUTCDate() - 1);
  return fecha;
}

export const MARTES_19_A_21: Franja = { diaSemana: 2, inicio: 19 * 60, fin: 21 * 60 };

let secuencia = 0;
const nuevoId = (prefijo: string) => `${prefijo}-${++secuencia}`;

function persona(p: PersonaFake): Required<PersonaFake> {
  return {
    activo: true,
    estado: 'activa',
    fechaNacimiento: ADULTA,
    genero: 'femenino',
    nombre: p.id,
    apellido: 'Apellido',
    telefono: '1100000000',
    ...p,
  };
}

function franjasDe(base: Base, solicitudId: string): Franja[] {
  return base.franjas.filter((f) => f.solicitudId === solicitudId).map(({ diaSemana, inicio, fin }) => ({ diaSemana, inicio, fin }));
}

function prismaEnMemoria(base: Base) {
  const db: Record<string, unknown> = {
    persona: {
      findUnique: async ({ where }: { where: { id: string } }) => {
        const p = base.personas.find((x) => x.id === where.id);
        return p ? persona(p) : null;
      },
      findMany: async ({ where }: { where: { id: { in: string[] } } }) =>
        base.personas.filter((p) => where.id.in.includes(p.id)).map(persona),
    },
    solicitudDiscipulado: {
      findFirst: async ({ where }: { where: { personaId: string; estado?: { in: string[] } } }) => {
        const candidatas = base.solicitudes
          .filter((s) => s.personaId === where.personaId && (!where.estado || where.estado.in.includes(s.estado)))
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        const s = candidatas[0];
        return s ? { ...s, franjas: franjasDe(base, s.id) } : null;
      },
      findUnique: async ({ where }: { where: { id: string } }) => {
        const s = base.solicitudes.find((x) => x.id === where.id);
        return s ? { ...s, franjas: franjasDe(base, s.id) } : null;
      },
      findMany: async ({ where }: { where: { id: { in: string[] } } }) => base.solicitudes.filter((s) => where.id.in.includes(s.id)),
      create: async ({ data }: { data: { personaId: string; creadoPorId: string | null; franjas: { create: Franja[] } } }) => {
        const s: SolicitudFake = {
          id: nuevoId('sol'),
          personaId: data.personaId,
          estado: 'pendiente',
          creadoPorId: data.creadoPorId,
          revisadoPorId: null,
          revisadaEn: null,
          createdAt: new Date(),
        };
        base.solicitudes.push(s);
        for (const f of data.franjas.create) base.franjas.push({ ...f, solicitudId: s.id });
        return s;
      },
      update: async ({ where, data }: { where: { id: string }; data: Partial<SolicitudFake> }) => {
        const s = base.solicitudes.find((x) => x.id === where.id)!;
        Object.assign(s, data);
        return s;
      },
    },
    franjaSolicitud: {
      deleteMany: async ({ where }: { where: { solicitudId: string } }) => {
        base.franjas = base.franjas.filter((f) => f.solicitudId !== where.solicitudId);
      },
      createMany: async ({ data }: { data: Array<Franja & { solicitudId: string }> }) => {
        base.franjas.push(...data);
      },
      findMany: async ({ where }: { where: { solicitudId: string } }) =>
        base.franjas.filter((f) => f.solicitudId === where.solicitudId).map(({ diaSemana, inicio, fin }) => ({ diaSemana, inicio, fin })),
    },
    propuestaDiscipulado: {
      findFirst: async ({ where }: { where: { solicitudId: string; estado: string } }) =>
        base.propuestas.find((p) => p.solicitudId === where.solicitudId && p.estado === where.estado) ?? null,
      findMany: async ({ where }: { where: { solicitudId: string | { in: string[] }; estado?: string } }) =>
        base.propuestas.filter(
          (p) =>
            (typeof where.solicitudId === 'string' ? p.solicitudId === where.solicitudId : where.solicitudId.in.includes(p.solicitudId)) &&
            (!where.estado || p.estado === where.estado),
        ),
      create: async ({ data }: { data: Omit<PropuestaFake, 'id' | 'propuestaEn' | 'estado' | 'retiradaPor' | 'respondidaEn' | 'motivoDeclinacion'> }) => {
        const p: PropuestaFake = {
          ...data,
          id: nuevoId('prop'),
          propuestaEn: new Date(),
          estado: 'pendiente',
          retiradaPor: null,
          respondidaEn: null,
          motivoDeclinacion: null,
        };
        base.propuestas.push(p);
        return p;
      },
      update: async ({ where, data }: { where: { id: string }; data: Partial<PropuestaFake> }) => {
        const p = base.propuestas.find((x) => x.id === where.id)!;
        Object.assign(p, data);
        return p;
      },
    },
    inscripcion: {
      count: async ({ where }: { where: { personaId: string; estado: { in: string[] } } }) =>
        base.inscripciones.filter((i) => i.personaId === where.personaId && where.estado.in.includes(i.estado)).length,
      // `cursaOCompletoVidaNueva` (discipulado/consultas.ts, la única tras el merge) usa findFirst.
      findFirst: async ({ where }: { where: { personaId: string; estado: { in: string[] } } }) =>
        base.inscripciones.find((i) => i.personaId === where.personaId && where.estado.in.includes(i.estado)) ?? null,
      findMany: async ({ where }: { where: { personaId: string } }) =>
        base.inscripciones
          .filter((i) => i.personaId === where.personaId)
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
    },
    liderazgo: {
      findFirst: async ({ where }: { where: { grupoId: string } }) =>
        base.liderazgos.find((l) => l.grupoId === where.grupoId && l.hasta === null) ?? null,
    },
    // Los `SELECT … FOR UPDATE`: la Solicitud por id, la abierta de una Persona, y la fila del Discipulador.
    $queryRaw: async (strings: TemplateStringsArray, ...valores: unknown[]) => {
      const sql = strings.join('?');
      if (sql.includes('FROM "solicitudes_discipulado"') && sql.includes('"personaId" =')) {
        return base.solicitudes.filter((s) => s.personaId === valores[0] && ['pendiente', 'propuesta'].includes(s.estado));
      }
      if (sql.includes('FROM "solicitudes_discipulado"')) return base.solicitudes.filter((s) => s.id === valores[0]);
      if (sql.includes('FROM "personas"')) return base.personas.filter((p) => p.id === valores[0]).map((p) => ({ id: p.id }));
      throw new Error(`SQL inesperado en el test: ${sql}`);
    },
  };
  db.$transaction = (fn: (tx: unknown) => unknown) => fn(db);
  return db;
}

export interface CandidatoFake {
  id: string;
  gruposConLugar?: Array<{ grupoId: string; ocupado: number; maximo: number; coincideHorario: boolean; personas: string[] }>;
}

/**
 * `disponibles` = los Discipuladores que hoy cumplen FR-006 (el cruce los
 * calcula; acá se declaran). Quien no está en la lista es "sin rol, sin
 * agenda, toggle apagado o con bloqueo vigente": para proponer da lo mismo cuál.
 */
export async function crearServicio(base: Partial<Base> = {}, disponibles: CandidatoFake[] = []) {
  const completa: Base = { personas: [], solicitudes: [], franjas: [], propuestas: [], inscripciones: [], liderazgos: [], ...base };
  const emitir = jest.fn();
  const cruceService = {
    disponibles: jest.fn(async () =>
      disponibles.map((d) => ({ id: d.id, nombre: d.id, apellido: '', genero: 'femenino', franjas: [], carga: { discipuladosActivos: 0, propuestasPendientes: 0 }, gruposConLugar: d.gruposConLugar ?? [] })),
    ),
    cruce: jest.fn(),
  };
  const moduleRef = await Test.createTestingModule({
    providers: [
      SolicitudDiscipuladoService,
      { provide: PrismaService, useValue: prismaEnMemoria(completa) },
      { provide: CruceService, useValue: cruceService },
      { provide: EventosDiscipuladoService, useValue: { emitir } },
    ],
  }).compile();
  return { service: moduleRef.get(SolicitudDiscipuladoService), base: completa, emitir, cruceService };
}

export function solicitud(personaId: string, estado: SolicitudFake['estado'], extra: Partial<SolicitudFake> = {}): SolicitudFake {
  return { id: nuevoId('sol'), personaId, estado, creadoPorId: null, revisadoPorId: null, revisadaEn: null, createdAt: new Date(Date.now() - 1000), ...extra };
}

export function propuesta(solicitudId: string, discipuladorId: string, extra: Partial<PropuestaFake> = {}): PropuestaFake {
  return {
    id: nuevoId('prop'),
    tipo: 'nueva',
    solicitudId,
    discipuladorId,
    grupoDestinoId: null,
    propuestaPorId: 'admin',
    propuestaEn: new Date(),
    estado: 'pendiente',
    retiradaPor: null,
    respondidaEn: null,
    motivoDeclinacion: null,
    ...extra,
  };
}

export async function errorDe(promesa: Promise<unknown>): Promise<AppException> {
  const error = await promesa.catch((e: unknown) => e);
  expect(error).toBeInstanceOf(AppException);
  return error as AppException;
}
