import { Injectable } from '@nestjs/common';
import {
  franjasCoinciden,
  type EventoDiscipulado,
  type Franja,
  type PropuestaParaMi,
} from '@vida-sobrenatural/shared-types';
import { PrismaService } from '../prisma/prisma.service.js';
import type { Prisma } from '../generated/prisma/client.js';
import { AppException } from '../common/errors/app-exception.js';
import { calcularEdad } from '../persona/calcular-edad.js';
import { EventosDiscipuladoService } from './eventos.js';
import { evaluar } from './reglas-de-asignacion/reglas.js';
import { bloquearGrupo, bloquearPersona, bloquearPropuesta, type PropuestaBloqueada } from './bloqueos.js';
import { cursaOCompletoVidaNueva, franjasDe, franjasDeSolicitudes } from './consultas.js';
import { normalizarMotivo } from './validaciones.js';

type Tx = Prisma.TransactionClient;

function propuestaNoVigente(): AppException {
  return new AppException('PROPUESTA_NO_VIGENTE', 409, 'La propuesta ya no está vigente: ya se respondió o el Admin la retiró.');
}

/**
 * specs/004, Historia 7 (FR-036/FR-037, contracts/discipulado-api.md): el
 * Discipulador ve sus propuestas pendientes (sin contacto) y las acepta o
 * declina. Aceptar es lo único que crea Grupo, Inscripción y Liderazgo.
 *
 * Orden de bloqueo, el mismo en todo el discipulado para que dos transiciones
 * no se esperen en cruz: Solicitud → Grupo → Propuesta → Persona. Por eso la
 * Propuesta se lee primero SIN bloquear (para saber qué Solicitud o Grupo
 * bloquear antes) y después se bloquea y se vuelve a mirar su estado.
 */
@Injectable()
export class PropuestasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventos: EventosDiscipuladoService,
  ) {}

  /** FR-037: las propuestas pendientes de esta Persona como Discipulador, más antiguas primero. Sin teléfono ni dirección. */
  async misPropuestas(discipuladorId: string): Promise<PropuestaParaMi[]> {
    const propuestas = await this.prisma.propuestaDiscipulado.findMany({
      where: { discipuladorId, estado: 'pendiente' },
      select: { id: true, tipo: true, solicitudId: true, grupoId: true, grupoDestinoId: true, propuestaEn: true },
      orderBy: { propuestaEn: 'asc' },
    });
    if (propuestas.length === 0) return [];

    const [discipulador, agenda] = await Promise.all([
      this.prisma.persona.findUnique({ where: { id: discipuladorId }, select: { genero: true } }),
      this.prisma.franjaAgenda.findMany({
        where: { personaId: discipuladorId, eliminadaEn: null },
        select: { diaSemana: true, inicio: true, fin: true },
      }),
    ]);

    // Grupos involucrados: el destino de una `nueva` (sumar) y el Grupo de una `reasignacion`.
    const grupoIds = propuestas.flatMap((p) => [p.grupoId, p.grupoDestinoId]).filter((id): id is string => id !== null);
    const inscripciones = grupoIds.length
      ? await this.prisma.inscripcion.findMany({
          where: { grupoId: { in: grupoIds }, estado: 'activa' },
          select: { grupoId: true, personaId: true, solicitudId: true },
          orderBy: { createdAt: 'asc' },
        })
      : [];
    const solicitudIds = [
      ...propuestas.map((p) => p.solicitudId).filter((id): id is string => id !== null),
      ...inscripciones.map((i) => i.solicitudId).filter((id): id is string => id !== null),
    ];
    const solicitudes = await this.prisma.solicitudDiscipulado.findMany({
      where: { id: { in: solicitudIds } },
      select: { id: true, personaId: true },
    });
    const personaDeSolicitud = new Map(solicitudes.map((s) => [s.id, s.personaId]));
    const personaIds = [...solicitudes.map((s) => s.personaId), ...inscripciones.map((i) => i.personaId)];
    const [personas, franjas] = await Promise.all([
      this.prisma.persona.findMany({
        where: { id: { in: [...new Set(personaIds)] } },
        // Sin telefono ni direccion a propósito (FR-037, SC-003): la propuesta no da el contacto.
        select: { id: true, nombre: true, apellido: true, fechaNacimiento: true, genero: true },
      }),
      franjasDeSolicitudes(this.prisma, solicitudIds),
    ]);
    const personaPorId = new Map(personas.map((p) => [p.id, p]));
    const inscripcionesPorGrupo = new Map<string, typeof inscripciones>();
    for (const i of inscripciones) inscripcionesPorGrupo.set(i.grupoId, [...(inscripcionesPorGrupo.get(i.grupoId) ?? []), i]);
    const nombreCompleto = (id: string) => {
      const p = personaPorId.get(id);
      return p ? `${p.nombre} ${p.apellido}` : '';
    };

    return propuestas.flatMap((p): PropuestaParaMi[] => {
      let personaId: string | undefined;
      let franjasObjetivo: Franja[];
      let grupoDestino: PropuestaParaMi['grupoDestino'] = null;

      if (p.tipo === 'nueva') {
        personaId = p.solicitudId ? personaDeSolicitud.get(p.solicitudId) : undefined;
        franjasObjetivo = (p.solicitudId && franjas.get(p.solicitudId)) || [];
        if (p.grupoDestinoId) {
          grupoDestino = { grupoId: p.grupoDestinoId, personas: (inscripcionesPorGrupo.get(p.grupoDestinoId) ?? []).map((i) => nombreCompleto(i.personaId)) };
        }
      } else {
        // Reasignación: la Persona que se nombra es la primera del Grupo; el
        // resto va en `grupoDestino.personas` (el Grupo que tomaría). Las
        // franjas son las de sus Solicitudes, todas juntas.
        const delGrupo = (p.grupoId && inscripcionesPorGrupo.get(p.grupoId)) || [];
        personaId = delGrupo[0]?.personaId;
        franjasObjetivo = delGrupo.flatMap((i) => franjasDe(franjas, i.solicitudId));
        if (p.grupoId) grupoDestino = { grupoId: p.grupoId, personas: delGrupo.map((i) => nombreCompleto(i.personaId)) };
      }

      const persona = personaId ? personaPorId.get(personaId) : undefined;
      if (!persona) return [];
      const { incumple } = evaluar({
        solicitud: { franjas: franjasObjetivo, genero: persona.genero },
        discipulador: { franjas: agenda, genero: discipulador?.genero ?? '' },
      });
      return [
        {
          propuestaId: p.id,
          tipo: p.tipo,
          persona: { nombre: persona.nombre, apellido: persona.apellido, edad: calcularEdad(persona.fechaNacimiento) },
          franjasEnComun: franjasObjetivo.filter((f) => agenda.some((a) => franjasCoinciden(f, a))),
          incumple,
          grupoDestino,
          propuestaEn: p.propuestaEn.toISOString(),
        },
      ];
    });
  }

  /** POST /discipulado/propuestas/:id/aceptar — contracts/discipulado-api.md, paso por paso. */
  async aceptar(propuestaId: string, discipuladorId: string): Promise<{ grupoId: string }> {
    const eventos: EventoDiscipulado[] = [];
    const resultado = await this.prisma.$transaction(async (tx) => {
      const leida = await this.leerPropia(tx, propuestaId, discipuladorId);

      // Solicitud → Grupo → Propuesta → Persona.
      if (leida.solicitudId) await tx.$queryRaw`SELECT "id" FROM "solicitudes_discipulado" WHERE "id" = ${leida.solicitudId} FOR UPDATE`;
      const grupoABloquear = leida.tipo === 'reasignacion' ? leida.grupoId : leida.grupoDestinoId;
      const grupo = grupoABloquear ? await bloquearGrupo(tx, grupoABloquear) : null;
      const propuesta = await bloquearPropuesta(tx, propuestaId);
      if (propuesta.estado !== 'pendiente') throw propuestaNoVigente();
      const discipulador = await bloquearPersona(tx, discipuladorId);
      // D137: con la fila bloqueada, quitarRol no puede colarse entre esta
      // lectura y el Liderazgo que se crea abajo.
      if (!discipulador.activo || !discipulador.rol.includes('discipulador')) {
        throw new AppException('SIN_PERMISO', 403, 'Ya no tenés el rol de Discipulador.');
      }

      const ahora = new Date();
      let grupoId: string;
      if (propuesta.tipo === 'nueva') {
        grupoId = await this.aceptarNueva(tx, propuesta, discipulador.maxPersonasPorGrupo, grupo, eventos);
      } else {
        grupoId = await this.aceptarReasignacion(tx, propuesta, grupo, ahora, eventos);
      }
      await tx.propuestaDiscipulado.update({
        where: { id: propuesta.id },
        data: { estado: 'aceptada', respondidaEn: ahora },
        select: { id: true },
      });
      return { grupoId };
    });
    // Después de confirmar (contracts/eventos.md): nunca un evento de algo que se deshizo.
    for (const e of eventos) this.eventos.emitir(e);
    return resultado;
  }

  /** POST /discipulado/propuestas/:id/declinar — la Solicitud vuelve a `pendiente`; una reasignación no toca el Grupo. */
  async declinar(propuestaId: string, discipuladorId: string, motivo: string | undefined): Promise<void> {
    const motivoLimpio = normalizarMotivo(motivo);
    const evento = await this.prisma.$transaction(async (tx) => {
      const leida = await this.leerPropia(tx, propuestaId, discipuladorId);
      if (leida.solicitudId) await tx.$queryRaw`SELECT "id" FROM "solicitudes_discipulado" WHERE "id" = ${leida.solicitudId} FOR UPDATE`;
      if (leida.tipo === 'reasignacion' && leida.grupoId) await bloquearGrupo(tx, leida.grupoId);
      const propuesta = await bloquearPropuesta(tx, propuestaId);
      if (propuesta.estado !== 'pendiente') throw propuestaNoVigente();

      await tx.propuestaDiscipulado.update({
        where: { id: propuesta.id },
        data: { estado: 'declinada', respondidaEn: new Date(), motivoDeclinacion: motivoLimpio },
        select: { id: true },
      });
      if (propuesta.tipo === 'nueva' && propuesta.solicitudId) {
        await tx.solicitudDiscipulado.update({ where: { id: propuesta.solicitudId }, data: { estado: 'pendiente' }, select: { id: true } });
      }
      const e: EventoDiscipulado = {
        nombre: 'propuesta_declinada',
        a: { tipo: 'admin' },
        datos: {
          propuestaId: propuesta.id,
          ...(propuesta.solicitudId ? { solicitudId: propuesta.solicitudId } : {}),
          ...(propuesta.grupoId ? { grupoId: propuesta.grupoId } : {}),
        },
      };
      return e;
    });
    this.eventos.emitir(evento);
  }

  /** La Propuesta, sin bloquear, solo si es de este Discipulador — ajena o inexistente: 404 (Principio V). */
  private async leerPropia(tx: Tx, propuestaId: string, discipuladorId: string) {
    const leida = await tx.propuestaDiscipulado.findUnique({
      where: { id: propuestaId },
      select: { tipo: true, solicitudId: true, grupoId: true, grupoDestinoId: true, discipuladorId: true },
    });
    if (!leida || leida.discipuladorId !== discipuladorId) {
      throw new AppException('NO_ENCONTRADO', 404, 'No encontramos esta propuesta.');
    }
    return leida;
  }

  private async aceptarNueva(
    tx: Tx,
    propuesta: PropuestaBloqueada,
    maximo: number,
    grupoDestino: Awaited<ReturnType<typeof bloquearGrupo>> | null,
    eventos: EventoDiscipulado[],
  ): Promise<string> {
    const solicitud = await tx.solicitudDiscipulado.findUnique({
      where: { id: propuesta.solicitudId! },
      select: { id: true, personaId: true, estado: true },
    });
    if (!solicitud || solicitud.estado !== 'propuesta') throw propuestaNoVigente();
    if (await cursaOCompletoVidaNueva(tx, solicitud.personaId)) {
      throw new AppException('VIDA_NUEVA_EN_CURSO_O_COMPLETADA', 409, 'Esta Persona ya está cursando o completó Vida Nueva.');
    }

    let grupoId: string;
    if (grupoDestino) {
      // FR-045: re-contar con el Grupo bloqueado — entre la propuesta y ahora pudo haberse llenado.
      const [liderazgo, ocupado] = await Promise.all([
        tx.liderazgo.findFirst({ where: { grupoId: grupoDestino.id, personaId: propuesta.discipuladorId, hasta: null }, select: { id: true } }),
        tx.inscripcion.count({ where: { grupoId: grupoDestino.id, estado: 'activa' } }),
      ]);
      if (grupoDestino.estado !== 'en_curso' || !liderazgo || ocupado >= maximo) {
        throw new AppException('GRUPO_SIN_LUGAR', 409, 'El Grupo ya no tiene lugar para sumar a esta Persona.');
      }
      grupoId = grupoDestino.id;
    } else {
      const [curso, persona] = await Promise.all([
        tx.curso.findUnique({ where: { categoria_tipo: { categoria: 'vida_nueva', tipo: 'individual' } }, select: { id: true } }),
        tx.persona.findUnique({ where: { id: solicitud.personaId }, select: { sedeId: true } }),
      ]);
      if (!curso || !persona) throw new AppException('ERROR_INTERNO', 500, 'Falta el Curso de Vida Nueva o la Persona.');
      const grupo = await tx.grupo.create({ data: { cursoId: curso.id, sedeId: persona.sedeId, estado: 'en_curso' }, select: { id: true } });
      grupoId = grupo.id;
      await tx.liderazgo.create({ data: { personaId: propuesta.discipuladorId, grupoId, propuestaId: propuesta.id }, select: { id: true } });
    }

    await tx.inscripcion.create({
      data: { personaId: solicitud.personaId, grupoId, solicitudId: solicitud.id, estado: 'activa' },
      select: { id: true },
    });
    await tx.solicitudDiscipulado.update({ where: { id: solicitud.id }, data: { estado: 'aprobada', grupoId }, select: { id: true } });
    eventos.push({
      nombre: 'propuesta_aceptada',
      a: { tipo: 'persona', personaId: solicitud.personaId },
      datos: { solicitudId: solicitud.id, grupoId, discipuladorId: propuesta.discipuladorId },
    });
    return grupoId;
  }

  private async aceptarReasignacion(
    tx: Tx,
    propuesta: PropuestaBloqueada,
    grupo: Awaited<ReturnType<typeof bloquearGrupo>> | null,
    ahora: Date,
    eventos: EventoDiscipulado[],
  ): Promise<string> {
    if (!grupo || grupo.estado !== 'en_curso') {
      throw new AppException('DISCIPULADO_NO_EN_CURSO', 409, 'Este discipulado ya no está en curso.');
    }
    // FR-030: se cierra el Liderazgo vigente y se abre el nuevo. Encuentros,
    // Asistencias y una finalización propuesta quedan como estaban.
    await tx.liderazgo.updateMany({
      where: { grupoId: grupo.id, hasta: null },
      data: { hasta: ahora, cerradoPorId: propuesta.propuestaPorId },
    });
    await tx.liderazgo.create({ data: { personaId: propuesta.discipuladorId, grupoId: grupo.id, propuestaId: propuesta.id, desde: ahora }, select: { id: true } });

    const inscripciones = await tx.inscripcion.findMany({ where: { grupoId: grupo.id, estado: 'activa' }, select: { personaId: true, solicitudId: true } });
    for (const i of inscripciones) {
      // Vida Nueva: toda Inscripción nace de una Solicitud de Discipulado.
      if (i.solicitudId === null) continue;
      eventos.push({
        nombre: 'propuesta_aceptada',
        a: { tipo: 'persona', personaId: i.personaId },
        datos: { solicitudId: i.solicitudId, grupoId: grupo.id, discipuladorId: propuesta.discipuladorId },
      });
    }
    return grupo.id;
  }
}

