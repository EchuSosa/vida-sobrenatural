import { Injectable } from '@nestjs/common';
import {
  normalizarWhatsappArgentino,
  type IntegranteMinisterio,
  type LiderMinisterioVista,
  type MinisterioLiderado,
  type MinisterioLideradoDetalle,
  type PersonaBreve,
} from '@vida-sobrenatural/shared-types';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AppException } from '../common/errors/app-exception.js';
import { esViolacionDeUnico } from './crear-postulacion.js';
import { NotificacionesService } from '../notificaciones/notificaciones.service.js';
import { otorgarLiderMinisterio, quitarLiderMinisterioSiNoLidera } from './rol-lider-ministerio.js';
import { miembrosActivosDe } from './miembros.js';

interface FilaIntegrante {
  id: string;
  celulaId: string | null;
  desde: Date;
  personaId: string;
  nombre: string;
  apellido: string;
  fotoUrl: string | null;
  telefono: string | null;
  email: string | null;
}

type Db = PrismaService | Prisma.TransactionClient;

const SELECT_PERSONA_BREVE = { id: true, nombre: true, apellido: true, fotoUrl: true } as const;
const ORDEN_PERSONA = [{ persona: { apellido: 'asc' } }, { persona: { nombre: 'asc' } }] as const;

/** Los líderes vigentes de varios Ministerios, por apellido — para el catálogo del backoffice. */
export async function lideresVigentesDe(db: Db, ministerioIds: string[]): Promise<Map<string, PersonaBreve[]>> {
  const mapa = new Map<string, PersonaBreve[]>();
  if (ministerioIds.length === 0) return mapa;
  const filas = await db.liderMinisterio.findMany({
    where: { ministerioId: { in: ministerioIds }, hasta: null },
    select: { ministerioId: true, persona: { select: SELECT_PERSONA_BREVE } },
    orderBy: [...ORDEN_PERSONA],
  });
  for (const f of filas) mapa.set(f.ministerioId, [...(mapa.get(f.ministerioId) ?? []), f.persona]);
  return mapa;
}

/** Ministerios activos que lidera hoy una Persona — para su Perfil. */
export function ministeriosQueLidera(db: Db, personaId: string): Promise<{ id: string; nombre: string }[]> {
  return db.ministerio.findMany({
    where: { activo: true, eliminadoEn: null, lideres: { some: { personaId, hasta: null } } },
    select: { id: true, nombre: true },
    orderBy: { nombre: 'asc' },
  });
}

/**
 * spec 016 (D244): los líderes de un Ministerio. El Admin los asigna y los
 * quita (el liderazgo se cierra con `hasta`, nunca se borra); el sistema da y
 * quita el rol `lider_ministerio`. Lo del líder ("Mi ministerio") se autoriza
 * contra la base — líder vigente de ESE Ministerio, activo — no contra el rol
 * del JWT (D226), que puede estar viejo si lo asignaron con la sesión abierta.
 */
@Injectable()
export class LideresMinisterioService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificaciones: NotificacionesService,
  ) {}

  // --- Admin ---

  async listar(ministerioId: string): Promise<LiderMinisterioVista[]> {
    await this.ministerioOFallar(ministerioId);
    const filas = await this.prisma.liderMinisterio.findMany({
      where: { ministerioId, hasta: null },
      select: { id: true, desde: true, persona: { select: SELECT_PERSONA_BREVE } },
      orderBy: [...ORDEN_PERSONA],
    });
    return filas.map((f) => ({ id: f.id, persona: f.persona, desde: f.desde.toISOString() }));
  }

  /** POST /ministerios/:id/lideres (FR-001 a FR-003, FR-006). */
  async asignar(ministerioId: string, personaId: string, adminId: string): Promise<LiderMinisterioVista> {
    return this.prisma.$transaction(async (tx) => {
      const ministerio = await this.ministerioOFallar(ministerioId, tx);
      if (!ministerio.activo) throw new AppException('MINISTERIO_NO_DISPONIBLE', 409, 'El Ministerio está inactivo.');
      const persona = await tx.persona.findUnique({ where: { id: personaId }, select: { estado: true, activo: true } });
      if (!persona || !persona.activo || persona.estado !== 'activa') {
        throw new AppException('NO_ENCONTRADO', 404, 'No existe una Persona activa con ese id.');
      }
      // El rol primero: si es menor, falla acá y no queda nada (D133).
      await otorgarLiderMinisterio(tx, personaId, adminId);
      let fila;
      try {
        fila = await tx.liderMinisterio.create({
          data: { ministerioId, personaId, asignadoPorId: adminId },
          select: { id: true, desde: true, persona: { select: SELECT_PERSONA_BREVE } },
        });
      } catch (error) {
        if (esViolacionDeUnico(error)) {
          throw new AppException('YA_ES_LIDER_DEL_MINISTERIO', 409, 'Ya es líder de este Ministerio.');
        }
        throw error;
      }
      await this.notificaciones.emitir(tx, {
        nombre: 'ministerio.lider_asignado',
        a: { tipo: 'persona', personaId },
        datos: { ministerioId, ministerio: ministerio.nombre },
      });
      return { id: fila.id, persona: fila.persona, desde: fila.desde.toISOString() };
    });
  }

  /** DELETE /ministerios/:id/lideres/:personaId (FR-001, FR-003): cierra el liderazgo vigente. */
  async quitar(ministerioId: string, personaId: string, adminId: string): Promise<{ id: string }> {
    return this.prisma.$transaction(async (tx) => {
      await this.ministerioOFallar(ministerioId, tx);
      const vigente = await tx.liderMinisterio.findFirst({ where: { ministerioId, personaId, hasta: null }, select: { id: true } });
      if (!vigente) throw new AppException('NO_ENCONTRADO', 404, 'No es líder vigente de este Ministerio.');
      await tx.liderMinisterio.update({ where: { id: vigente.id }, data: { hasta: new Date(), quitadoPorId: adminId } });
      await quitarLiderMinisterioSiNoLidera(tx, personaId, adminId);
      return { id: vigente.id };
    });
  }

  /** Al inactivar o reactivar un Ministerio (spec, escenario 5): el rol sigue a los Ministerios activos. */
  async sincronizarRolPorEstado(tx: Prisma.TransactionClient, ministerioId: string, activo: boolean, adminId: string): Promise<void> {
    const lideres = await tx.liderMinisterio.findMany({ where: { ministerioId, hasta: null }, select: { personaId: true } });
    for (const l of lideres) {
      if (activo) await otorgarLiderMinisterio(tx, l.personaId, adminId);
      else await quitarLiderMinisterioSiNoLidera(tx, l.personaId, adminId);
    }
  }

  // --- Líder ---

  /** GET /ministerios/liderados: los Ministerios activos que lidera la persona de la sesión. */
  async liderados(personaId: string): Promise<MinisterioLiderado[]> {
    const ministerios = await this.prisma.ministerio.findMany({
      where: { activo: true, eliminadoEn: null, lideres: { some: { personaId, hasta: null } } },
      select: { id: true, nombre: true },
      orderBy: { nombre: 'asc' },
    });
    return Promise.all(ministerios.map(async (m) => ({ ...m, ...(await this.totales(m.id)) })));
  }

  /** GET /ministerios/liderados/:id: el equipo por área, con contacto (Pregunta 1 de la 016). */
  async lideradoDetalle(personaId: string, ministerioId: string): Promise<MinisterioLideradoDetalle> {
    const m = await this.prisma.ministerio.findFirst({
      where: { id: ministerioId, activo: true, eliminadoEn: null, lideres: { some: { personaId, hasta: null } } },
      select: { id: true, nombre: true, descripcion: true },
    });
    if (!m) throw new AppException('NO_ENCONTRADO', 404, 'No liderás ese Ministerio.');
    const [celulas, filas, lideres] = await Promise.all([
      this.prisma.celula.findMany({
        where: { ministerioId, eliminadoEn: null },
        select: { id: true, nombre: true, activo: true },
        orderBy: { nombre: 'asc' },
      }),
      // La misma definición de miembro que `miembros.ts` (D170): aprobada + Persona activa.
      this.prisma.$queryRaw<FilaIntegrante[]>`
        SELECT p."id", p."celulaId", coalesce(p."revisadaEn", p."createdAt") AS "desde",
               pe."id" AS "personaId", pe."nombre", pe."apellido", pe."fotoUrl", pe."telefono", pe."email"
          FROM "postulaciones" p
          JOIN "personas" pe ON pe."id" = p."personaId"
         WHERE p."ministerioId" = ${ministerioId} AND p."estado" = 'aprobada' AND pe."activo" = true
         ORDER BY pe."apellido", pe."nombre", p."id"`,
      this.prisma.liderMinisterio.findMany({
        where: { ministerioId, hasta: null, personaId: { not: personaId } },
        select: { persona: { select: SELECT_PERSONA_BREVE } },
        orderBy: [...ORDEN_PERSONA],
      }),
    ]);
    const integrante = (f: FilaIntegrante): IntegranteMinisterio => {
      const telefono = f.telefono?.trim() ? f.telefono.trim() : null;
      return {
        postulacionId: f.id,
        persona: {
          id: f.personaId,
          nombre: f.nombre,
          apellido: f.apellido,
          fotoUrl: f.fotoUrl,
          telefono,
          email: f.email,
          whatsapp: telefono ? normalizarWhatsappArgentino(telefono) : null,
        },
        desde: f.desde.toISOString(),
      };
    };
    const conArea = new Set(celulas.map((c) => c.id));
    return {
      ...m,
      integrantes: filas.length,
      areas: celulas.filter((c) => c.activo).length,
      porArea: celulas.map((celula) => ({
        celula,
        integrantes: filas.filter((f) => f.celulaId === celula.id).map(integrante),
      })),
      sinArea: filas.filter((f) => !f.celulaId || !conArea.has(f.celulaId)).map(integrante),
      otrosLideres: lideres.map((l) => l.persona),
    };
  }

  private async totales(ministerioId: string): Promise<{ integrantes: number; areas: number }> {
    const [integrantes, areas] = await Promise.all([
      miembrosActivosDe(this.prisma, ministerioId).then((ids) => ids.length),
      this.prisma.celula.count({ where: { ministerioId, eliminadoEn: null, activo: true } }),
    ]);
    return { integrantes, areas };
  }

  private async ministerioOFallar(id: string, db: Db = this.prisma): Promise<{ id: string; nombre: string; activo: boolean }> {
    const m = await db.ministerio.findFirst({ where: { id, eliminadoEn: null }, select: { id: true, nombre: true, activo: true } });
    if (!m) throw new AppException('NO_ENCONTRADO', 404, 'No existe un Ministerio con ese id.');
    return m;
  }
}
