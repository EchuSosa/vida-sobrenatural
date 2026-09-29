import { Injectable } from '@nestjs/common';
import type { DetalleMiDiscipulado, EncuentroDelDiscipulador, MiDiscipulado } from '@vida-sobrenatural/shared-types';
import { PrismaService } from '../prisma/prisma.service.js';
import type { Prisma } from '../generated/prisma/client.js';
import { calcularEdad } from '../persona/calcular-edad.js';
import { comoFechaCivil, exigirLiderazgoVigente } from './consultas.js';
import { contactoDe } from './validaciones.js';

type Db = PrismaService | Prisma.TransactionClient;

/**
 * Hasta qué edad el Discipulador ve también el contacto del tutor (FR-044,
 * research #19): la mayoría de edad. Constante propia (H-128): no es la edad
 * para pedir solo (12) ni la de un rol de cargo, aunque hoy valga lo mismo que
 * esta última.
 */
const MAYORIA_DE_EDAD_CONTACTO_TUTOR = 18;

/**
 * specs/004, Historia 5 (D134, FR-011): el escritorio del Discipulador. Solo
 * lo que lidera HOY (Liderazgo vigente): con el contacto de cada Persona y,
 * en el detalle, los Encuentros con notas — incluidas las de un Discipulador
 * anterior (FR-030). Nada de esto sale por las rutas del Admin.
 */
@Injectable()
export class MisDiscipuladosService {
  constructor(private readonly prisma: PrismaService) {}

  /** Los Grupos que lidera, en curso primero. */
  async misDiscipulados(discipuladorId: string): Promise<MiDiscipulado[]> {
    const liderazgos = await this.prisma.liderazgo.findMany({
      where: { personaId: discipuladorId, hasta: null },
      select: { grupoId: true, desde: true },
      orderBy: { desde: 'desc' },
    });
    const armados = await armarMisDiscipulados(this.prisma, discipuladorId, liderazgos);
    return armados.sort((a, b) => Number(b.estado === 'en_curso') - Number(a.estado === 'en_curso'));
  }

  /** GET /discipulado/mis-discipulados/:grupoId — 404 si no tiene el Liderazgo vigente (Principio V). */
  async miDiscipulado(discipuladorId: string, grupoId: string): Promise<DetalleMiDiscipulado> {
    const liderazgo = await exigirLiderazgoVigente(this.prisma, discipuladorId, grupoId);
    const [discipulado] = await armarMisDiscipulados(this.prisma, discipuladorId, [{ grupoId, desde: liderazgo.desde }]);
    const encuentros = await this.prisma.encuentro.findMany({
      where: { grupoId },
      select: SELECT_ENCUENTRO_DEL_DISCIPULADOR,
      orderBy: [{ fecha: 'desc' }, { createdAt: 'desc' }],
    });
    return { ...discipulado, encuentros: encuentros.map(aEncuentroDelDiscipulador) };
  }
}

export const SELECT_ENCUENTRO_DEL_DISCIPULADOR = {
  id: true,
  fecha: true,
  capitulos: true,
  notas: true,
  updatedAt: true,
  asistencias: { select: { presente: true, inscripcion: { select: { personaId: true } } } },
} as const;

type EncuentroLeido = {
  id: string;
  fecha: Date;
  capitulos: string;
  notas: string | null;
  updatedAt: Date;
  asistencias: Array<{ presente: boolean; inscripcion: { personaId: string } }>;
};

export function aEncuentroDelDiscipulador(e: EncuentroLeido): EncuentroDelDiscipulador {
  return {
    id: e.id,
    fecha: comoFechaCivil(e.fecha),
    capitulos: e.capitulos,
    notas: e.notas,
    asistencias: e.asistencias.map((a) => ({ personaId: a.inscripcion.personaId, presente: a.presente })),
    updatedAt: e.updatedAt.toISOString(),
  };
}

async function armarMisDiscipulados(
  db: Db,
  discipuladorId: string,
  liderazgos: Array<{ grupoId: string; desde: Date }>,
): Promise<MiDiscipulado[]> {
  if (liderazgos.length === 0) return [];
  const grupoIds = liderazgos.map((l) => l.grupoId);
  const [grupos, inscripciones, discipulador] = await Promise.all([
    db.grupo.findMany({
      where: { id: { in: grupoIds } },
      select: { id: true, estado: true, propuestaFinalizacionEn: true, finalizacionRechazadaEn: true, finalizacionRechazadaMotivo: true },
    }),
    db.inscripcion.findMany({
      // Las que están cursando o terminaron; una baja confirmada ya no es de este discipulado.
      where: { grupoId: { in: grupoIds }, estado: { in: ['activa', 'completada'] } },
      select: {
        id: true,
        grupoId: true,
        personaId: true,
        estado: true,
        bajaPropuestaEn: true,
        bajaPropuestaMotivo: true,
        bajaRechazadaEn: true,
        bajaRechazadaMotivo: true,
      },
      orderBy: { createdAt: 'asc' },
    }),
    db.persona.findUnique({ where: { id: discipuladorId }, select: { maxPersonasPorGrupo: true } }),
  ]);
  const personaIds = [...new Set(inscripciones.map((i) => i.personaId))];
  const [personas, tutores] = await Promise.all([
    db.persona.findMany({
      where: { id: { in: personaIds } },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        fechaNacimiento: true,
        telefono: true,
        direccion: true,
        tutorNombre: true,
        tutorApellido: true,
        tutorTelefono: true,
      },
    }),
    // D112: el vínculo `tutor` se guarda con el menor como sujeto.
    db.relacionFamiliar.findMany({
      where: { personaId: { in: personaIds }, tipoRelacion: 'tutor' },
      select: { personaId: true, familiar: { select: { nombre: true, apellido: true, telefono: true } } },
      orderBy: { createdAt: 'asc' },
    }),
  ]);
  const personaPorId = new Map(personas.map((p) => [p.id, p]));
  const tutorPorPersona = new Map<string, { nombre: string; apellido: string; telefono: string }>();
  for (const t of tutores) if (!tutorPorPersona.has(t.personaId)) tutorPorPersona.set(t.personaId, t.familiar);
  const grupoPorId = new Map(grupos.map((g) => [g.id, g]));
  const maximo = discipulador?.maxPersonasPorGrupo ?? 1;

  return liderazgos.flatMap((l): MiDiscipulado[] => {
    const g = grupoPorId.get(l.grupoId);
    if (!g) return [];
    const delGrupo = inscripciones.filter((i) => i.grupoId === g.id);
    return [
      {
        grupoId: g.id,
        personas: delGrupo.flatMap((i) => {
          const p = personaPorId.get(i.personaId);
          if (!p) return [];
          const edad = calcularEdad(p.fechaNacimiento);
          return [
            {
              inscripcionId: i.id,
              personaId: p.id,
              nombre: p.nombre,
              apellido: p.apellido,
              edad,
              contacto: contactoDe({
                telefono: p.telefono,
                direccion: p.direccion,
                esMenor: edad < MAYORIA_DE_EDAD_CONTACTO_TUTOR,
                tutorNombre: p.tutorNombre,
                tutorApellido: p.tutorApellido,
                tutorTelefono: p.tutorTelefono,
                tutorVinculado: tutorPorPersona.get(p.id) ?? null,
              }),
              bajaPropuesta: i.bajaPropuestaEn ? { en: i.bajaPropuestaEn.toISOString(), motivo: i.bajaPropuestaMotivo } : null,
              bajaRechazada: i.bajaRechazadaEn ? { en: i.bajaRechazadaEn.toISOString(), motivo: i.bajaRechazadaMotivo } : null,
            },
          ];
        }),
        desde: l.desde.toISOString(),
        estado: g.estado,
        lugar: { ocupado: delGrupo.filter((i) => i.estado === 'activa').length, maximo },
        propuestaFinalizacionEn: g.propuestaFinalizacionEn?.toISOString() ?? null,
        finalizacionRechazada: g.finalizacionRechazadaEn
          ? { en: g.finalizacionRechazadaEn.toISOString(), motivo: g.finalizacionRechazadaMotivo }
          : null,
      },
    ];
  });
}
