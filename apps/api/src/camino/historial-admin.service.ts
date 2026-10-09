import { Injectable } from '@nestjs/common';
import {
  ETAPAS_CAMINO,
  MOTIVO_RECHAZO_DECLARACION_MAX,
  NOTA_COMPLETITUD_MAX,
  sinAccesoALaApp,
  type CaminoDePersonaAdmin,
  type ContextoEtapa,
  type DeclaracionDetalle,
  type EtapaCamino,
} from '@vida-sobrenatural/shared-types';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AppException } from '../common/errors/app-exception.js';
import { calcularEdad } from '../persona/calcular-edad.js';
import { errorDeValidacion } from '../discipulado/validaciones.js';
import { nombresDe } from '../discipulado/consultas.js';
import { NotificacionesService } from '../notificaciones/notificaciones.service.js';
import { BautismoService } from '../bautismo/bautismo.service.js';
import { bloquearPersona, completoEtapa, vidaNuevaEnMarcha } from './consultas.js';
import { alCompletarCategoria } from '../vida-de-servicio/efectos.js';

type Db = PrismaService | Prisma.TransactionClient;

/**
 * spec 006, Historia 2 — lado del Admin (contracts/historial-admin-api.md):
 * confirmar o no confirmar un "Ya lo hice", registrar una etapa hecha sin
 * declaración (Flujo 9) y anularla. Cada transición bloquea primero la fila de
 * la Persona (research #5) y emite su aviso DENTRO de la transacción (D197).
 * Nada de esto toca `Persona.rol` (FR-019).
 */
@Injectable()
export class HistorialAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificaciones: NotificacionesService,
    // spec 010 (H3): confirmar "ya se bautizó" retira la Solicitud de Bautismo abierta, si hay.
    private readonly bautismo: BautismoService,
  ) {}

  /** GET /historial/declaraciones/:id (FR-013). */
  async detalle(id: string): Promise<DeclaracionDetalle> {
    const d = await this.prisma.declaracionHistorial.findUnique({
      where: { id },
      select: {
        id: true, personaId: true, etapa: true, estado: true, comentario: true, createdAt: true,
        revisadoPorId: true, revisadaEn: true, motivoRechazo: true,
      },
    });
    if (!d) throw noEncontrada();
    const [persona, contexto, anteriores, nombres] = await Promise.all([
      this.prisma.persona.findUniqueOrThrow({
        where: { id: d.personaId },
        select: { id: true, nombre: true, apellido: true, fotoUrl: true, fechaNacimiento: true, email: true },
      }),
      contextoDeEtapa(this.prisma, d.personaId, d.etapa),
      this.prisma.declaracionHistorial.findMany({
        where: { personaId: d.personaId, etapa: d.etapa, id: { not: d.id }, createdAt: { lt: d.createdAt } },
        orderBy: { createdAt: 'desc' },
        select: { estado: true, createdAt: true, revisadaEn: true, retiradaEn: true },
      }),
      nombresDe(this.prisma, d.revisadoPorId ? [d.revisadoPorId] : []),
    ]);
    return {
      id: d.id,
      etapa: d.etapa,
      estado: d.estado,
      comentario: d.comentario,
      createdAt: d.createdAt.toISOString(),
      revisadoPor: d.revisadoPorId ? (nombres.get(d.revisadoPorId) ?? null) : null,
      revisadaEn: d.revisadaEn?.toISOString() ?? null,
      motivoRechazo: d.motivoRechazo,
      persona: {
        id: persona.id,
        nombre: persona.nombre,
        apellido: persona.apellido,
        fotoUrl: persona.fotoUrl,
        edad: calcularEdad(persona.fechaNacimiento),
        sinAccesoALaApp: sinAccesoALaApp(persona),
      },
      contexto: {
        ...contexto,
        declaracionesAnteriores: anteriores.map((a) => ({ estado: a.estado, fecha: (a.revisadaEn ?? a.retiradaEn ?? a.createdAt).toISOString() })),
      },
    };
  }

  /** POST /historial/declaraciones/:id/confirmar (FR-013): pasa a confirmada y crea la Completitud. */
  async confirmar(id: string, autorId: string): Promise<DeclaracionDetalle> {
    await this.prisma.$transaction(async (tx) => {
      const d = await bloquearDeclaracionPendiente(tx, id);
      await exigirEtapaNoCompletaNiEnCurso(tx, d.personaId, d.etapa);
      await tx.declaracionHistorial.update({ where: { id }, data: { estado: 'confirmada', revisadoPorId: autorId, revisadaEn: new Date() } });
      await tx.completitudManual.create({
        data: { personaId: d.personaId, etapa: d.etapa, origen: 'declaracion', declaracionId: id, registradaPorId: autorId },
      });
      if (d.etapa === 'bautismo') await this.bautismo.retirarPorDeclaracion(tx, d.personaId);
      await alCompletarCategoria(tx, d.personaId, d.etapa); // spec 008, FR-042
      await this.notificaciones.emitir(tx, {
        nombre: 'historial.declaracion_confirmada',
        a: { tipo: 'persona', personaId: d.personaId },
        datos: { declaracionId: id, etapa: d.etapa },
      });
    });
    return this.detalle(id);
  }

  /** POST /historial/declaraciones/:id/rechazar (FR-013): "No confirmar", con un motivo opcional que lee la Persona. */
  async rechazar(id: string, motivoCrudo: string | undefined, autorId: string): Promise<DeclaracionDetalle> {
    const motivo = textoOpcional(motivoCrudo, MOTIVO_RECHAZO_DECLARACION_MAX, 'motivo', 'MOTIVO_DEMASIADO_LARGO');
    await this.prisma.$transaction(async (tx) => {
      const d = await bloquearDeclaracionPendiente(tx, id);
      await tx.declaracionHistorial.update({
        where: { id },
        data: { estado: 'rechazada', revisadoPorId: autorId, revisadaEn: new Date(), motivoRechazo: motivo },
      });
      await this.notificaciones.emitir(tx, {
        nombre: 'historial.declaracion_rechazada',
        a: { tipo: 'persona', personaId: d.personaId },
        datos: { declaracionId: id, etapa: d.etapa },
      });
    });
    return this.detalle(id);
  }

  /** GET /personas/:id/camino (FR-014): las cuatro etapas de una Persona, para registrar o anular. */
  async caminoDePersona(personaId: string): Promise<CaminoDePersonaAdmin> {
    const persona = await this.prisma.persona.findUnique({ where: { id: personaId }, select: { id: true } });
    if (!persona) throw new AppException('NO_ENCONTRADO', 404, 'No existe una Persona con ese id.');
    const [contextos, pendientes] = await Promise.all([
      Promise.all(ETAPAS_CAMINO.map((etapa) => contextoDeEtapa(this.prisma, personaId, etapa))),
      this.prisma.declaracionHistorial.findMany({ where: { personaId, estado: 'pendiente' }, select: { id: true, etapa: true, createdAt: true } }),
    ]);
    return {
      etapas: ETAPAS_CAMINO.map((etapa, i) => {
        const pendiente = pendientes.find((p) => p.etapa === etapa);
        return { etapa, ...contextos[i], declaracionPendiente: pendiente ? { id: pendiente.id, createdAt: pendiente.createdAt.toISOString() } : null };
      }),
    };
  }

  /**
   * POST /personas/:id/completitudes (FR-014): registrar una etapa hecha sin
   * declaración. Si había una pendiente de esa etapa, queda confirmada y la
   * Completitud se vincula a ella (`origen: declaracion`).
   */
  async registrar(personaId: string, etapa: EtapaCamino, notaCruda: string | undefined, autorId: string): Promise<{ id: string }> {
    const nota = textoOpcional(notaCruda, NOTA_COMPLETITUD_MAX, 'nota', 'NOTA_DEMASIADO_LARGA');
    try {
      return await this.prisma.$transaction(async (tx) => {
        if (!(await bloquearPersona(tx, personaId))) throw new AppException('NO_ENCONTRADO', 404, 'No existe una Persona con ese id.');
        await exigirEtapaNoCompletaNiEnCurso(tx, personaId, etapa);
        const pendiente = await tx.declaracionHistorial.findFirst({ where: { personaId, etapa, estado: 'pendiente' }, select: { id: true } });
        if (pendiente) {
          await tx.declaracionHistorial.update({ where: { id: pendiente.id }, data: { estado: 'confirmada', revisadoPorId: autorId, revisadaEn: new Date() } });
        }
        const completitud = await tx.completitudManual.create({
          data: {
            personaId,
            etapa,
            origen: pendiente ? 'declaracion' : 'admin',
            declaracionId: pendiente?.id ?? null,
            nota,
            registradaPorId: autorId,
          },
          select: { id: true },
        });
        if (etapa === 'bautismo') await this.bautismo.retirarPorDeclaracion(tx, personaId);
        await alCompletarCategoria(tx, personaId, etapa); // spec 008, FR-042
        await this.notificaciones.emitir(tx, {
          nombre: 'historial.completitud_registrada',
          a: { tipo: 'persona', personaId },
          datos: { completitudId: completitud.id, etapa },
        });
        if (pendiente) {
          await this.notificaciones.emitir(tx, {
            nombre: 'historial.declaracion_confirmada',
            a: { tipo: 'persona', personaId },
            datos: { declaracionId: pendiente.id, etapa },
          });
        }
        return completitud;
      });
    } catch (error) {
      // FR-015: el índice parcial `completitudes_manuales_una_vigente` es la garantía ante una carrera.
      if (typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 'P2002') throw yaCompleta();
      throw error;
    }
  }

  /** POST /personas/:id/completitudes/:completitudId/anular (FR-015): borrado lógico; la declaración que la originó queda como historia. */
  async anular(personaId: string, completitudId: string, autorId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await bloquearPersona(tx, personaId);
      const c = await tx.completitudManual.findFirst({ where: { id: completitudId, personaId }, select: { id: true, anuladaEn: true } });
      if (!c) throw new AppException('NO_ENCONTRADO', 404, 'No existe esa etapa registrada para esta Persona.');
      if (c.anuladaEn) throw new AppException('COMPLETITUD_NO_VIGENTE', 409, 'Esa etapa registrada ya estaba anulada.');
      await tx.completitudManual.update({ where: { id: c.id }, data: { anuladaEn: new Date(), anuladaPorId: autorId } });
    });
  }
}

/** Lo que el sistema sabe de una Persona en una etapa (FR-013/FR-014). */
async function contextoDeEtapa(db: Db, personaId: string, etapa: EtapaCamino): Promise<ContextoEtapa> {
  const [completa, enCurso, vigente] = await Promise.all([
    completoEtapa(db, personaId, etapa),
    etapa === 'vida_nueva' ? vidaNuevaEnMarcha(db, personaId) : Promise.resolve(false),
    db.completitudManual.findFirst({
      where: { personaId, etapa, anuladaEn: null },
      select: { id: true, origen: true, registradaEn: true, registradaPorId: true, nota: true },
    }),
  ]);
  const nombres = await nombresDe(db, vigente ? [vigente.registradaPorId] : []);
  return {
    completa,
    enCurso,
    completitudVigente: vigente
      ? { id: vigente.id, origen: vigente.origen, registradaEn: vigente.registradaEn.toISOString(), registradaPor: nombres.get(vigente.registradaPorId) ?? null, nota: vigente.nota }
      : null,
  };
}

/** Bloquea la Persona de la declaración y exige que siga pendiente (otra pestaña pudo resolverla). */
async function bloquearDeclaracionPendiente(tx: Prisma.TransactionClient, id: string) {
  const previa = await tx.declaracionHistorial.findUnique({ where: { id }, select: { personaId: true } });
  if (!previa) throw noEncontrada();
  await bloquearPersona(tx, previa.personaId);
  const d = await tx.declaracionHistorial.findUniqueOrThrow({ where: { id }, select: { personaId: true, etapa: true, estado: true } });
  if (d.estado !== 'pendiente') throw new AppException('DECLARACION_NO_PENDIENTE', 409, 'Esta declaración ya no está pendiente.');
  return d;
}

/**
 * FR-013/FR-014: no se registra una etapa que ya figura completa (por el
 * sistema o con Completitud vigente), ni Vida Nueva mientras está en marcha.
 */
async function exigirEtapaNoCompletaNiEnCurso(tx: Prisma.TransactionClient, personaId: string, etapa: EtapaCamino) {
  if (await completoEtapa(tx, personaId, etapa)) throw yaCompleta();
  if (etapa === 'vida_nueva' && (await vidaNuevaEnMarcha(tx, personaId))) {
    throw new AppException('ETAPA_EN_CURSO', 409, 'Vida Nueva está en marcha: primero se retira el pedido o se cierra el Grupo.');
  }
}

function textoOpcional(texto: string | undefined, max: number, campo: string, code: string): string | null {
  const limpio = texto?.trim() ?? '';
  if (limpio.length > max) throw errorDeValidacion([{ campo, code }]);
  return limpio === '' ? null : limpio;
}

function noEncontrada() {
  return new AppException('NO_ENCONTRADO', 404, 'No existe esa declaración.');
}

function yaCompleta() {
  return new AppException('ETAPA_YA_COMPLETADA', 409, 'Esta etapa ya figura como hecha.');
}
