import { Injectable } from '@nestjs/common';
import { alertaFaltas, hoyEnArgentina, type AsistenciaDelDia } from '@vida-sobrenatural/shared-types';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { errorDeValidacion } from '../discipulado/validaciones.js';
import { aFecha, bloquearGrupo, cierreCivil, faltasPorInscripcion, fechaCivil, grupoNoEnCurso, grupoVSOFallar } from './consultas-vs.js';

type Db = PrismaService | Prisma.TransactionClient;

const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * spec 008, Historia 6 — tomar asistencia (contracts/lider-api.md; FR-027 a
 * FR-030; research #13): un Encuentro de asistencia (sin capítulos ni notas,
 * D45) por Grupo y fecha, y una Asistencia por cada Inscripción que estaba
 * `activa` ESA fecha. Todos presentes por defecto; el cuerpo trae solo los
 * ausentes. Idempotente: se puede corregir mientras el Grupo esté en curso.
 * Tomar asistencia no libera material ni al revés (FR-030). Lo usan el Líder
 * y el Admin (la autorización la hace quien llama).
 */
@Injectable()
export class AsistenciaService {
  constructor(private readonly prisma: PrismaService) {}

  /** GET …/asistencia/:fecha. */
  async delDia(grupoId: string, fecha: string): Promise<AsistenciaDelDia> {
    validarFormato(fecha);
    await grupoVSOFallar(this.prisma, grupoId);
    return asistenciaDelDia(this.prisma, grupoId, fecha);
  }

  /** PUT …/asistencia/:fecha `{ ausentes }`. */
  async guardar(grupoId: string, fecha: string, ausentes: string[], autorId: string): Promise<AsistenciaDelDia> {
    validarFormato(fecha);
    await this.prisma.$transaction(async (tx) => {
      await bloquearGrupo(tx, grupoId);
      const grupo = await grupoVSOFallar(tx, grupoId);
      if (grupo.estado !== 'en_curso') throw grupoNoEnCurso();
      if (fecha > hoyEnArgentina()) throw errorDeValidacion([{ campo: 'fecha', code: 'FECHA_FUTURA' }]);
      if (grupo.fechaInicio && fecha < fechaCivil(grupo.fechaInicio)) throw errorDeValidacion([{ campo: 'fecha', code: 'FECHA_ANTERIOR_AL_INICIO' }]);
      const activas = await activasEnLaFecha(tx, grupoId, fecha);
      const ids = new Set(activas.map((a) => a.id));
      if (ausentes.some((id) => !ids.has(id))) throw errorDeValidacion([{ campo: 'ausentes', code: 'INSCRIPCION_AJENA' }]);

      const existente = await tx.encuentro.findFirst({ where: { grupoId, fecha: aFecha(fecha), capitulos: null }, select: { id: true } });
      const encuentro = existente ?? (await tx.encuentro.create({ data: { grupoId, fecha: aFecha(fecha), registradoPorId: autorId }, select: { id: true } }));
      const faltan = new Set(ausentes);
      for (const a of activas) {
        await tx.asistencia.upsert({
          where: { encuentroId_inscripcionId: { encuentroId: encuentro.id, inscripcionId: a.id } },
          create: { encuentroId: encuentro.id, inscripcionId: a.id, presente: !faltan.has(a.id) },
          update: { presente: !faltan.has(a.id) },
        });
      }
    });
    return asistenciaDelDia(this.prisma, grupoId, fecha);
  }
}

function validarFormato(fecha: string): void {
  if (!FECHA_RE.test(fecha) || Number.isNaN(Date.parse(fecha))) throw errorDeValidacion([{ campo: 'fecha', code: 'FECHA_INVALIDA' }]);
}

/**
 * Las Inscripciones que estaban `activa` en esa fecha: inscriptas ese día o
 * antes (edge case: quien entra después no suma faltas de antes), y todavía
 * activas o cerradas después de esa fecha.
 */
async function activasEnLaFecha(db: Db, grupoId: string, fecha: string) {
  const inscripciones = await db.inscripcion.findMany({
    where: { grupoId },
    orderBy: { createdAt: 'asc' },
    select: { id: true, personaId: true, estado: true, createdAt: true, cerradaEn: true },
  });
  return inscripciones.filter((i) => hoyEnArgentina(i.createdAt) <= fecha && (i.estado === 'activa' || (cierreCivil(i.cerradaEn) ?? '') > fecha));
}

async function asistenciaDelDia(db: Db, grupoId: string, fecha: string): Promise<AsistenciaDelDia> {
  const [activas, encuentro, faltas] = await Promise.all([
    activasEnLaFecha(db, grupoId, fecha),
    db.encuentro.findFirst({ where: { grupoId, fecha: aFecha(fecha), capitulos: null }, select: { asistencias: { select: { inscripcionId: true, presente: true } } } }),
    faltasPorInscripcion(db, [grupoId]),
  ]);
  const personas = await db.persona.findMany({ where: { id: { in: activas.map((a) => a.personaId) } }, select: { id: true, nombre: true, apellido: true } });
  const porPersona = new Map(personas.map((p) => [p.id, p]));
  const presentes = new Map(encuentro?.asistencias.map((a) => [a.inscripcionId, a.presente]) ?? []);
  return {
    fecha,
    guardada: encuentro !== null,
    inscriptos: activas
      .map((a) => {
        const p = porPersona.get(a.personaId)!;
        const cantidad = faltas.get(a.id) ?? 0;
        return { inscripcionId: a.id, nombre: p.nombre, apellido: p.apellido, presente: presentes.get(a.id) ?? true, faltas: cantidad, alertaFaltas: alertaFaltas(cantidad) };
      })
      .sort((x, y) => x.apellido.localeCompare(y.apellido) || x.nombre.localeCompare(y.nombre)),
  };
}

