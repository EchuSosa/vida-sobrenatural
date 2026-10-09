import { Injectable } from '@nestjs/common';
import {
  AVISOS_POR_PAGINA,
  CATALOGO_AVISOS,
  type AvisoDetalle,
  type AvisoResumen,
  type NombreEventoAviso,
  type Pagina,
} from '@vida-sobrenatural/shared-types';
import { PrismaService } from '../prisma/prisma.service.js';
import { AppException } from '../common/errors/app-exception.js';
import { extractoDe } from './extracto.js';

const SELECT_ENTREGA = {
  id: true,
  leidaEn: true,
  createdAt: true,
  notificacion: { select: { tipo: true, prioridad: true, evento: true, params: true, titulo: true, mensaje: true } },
} as const;

interface FilaEntrega {
  id: string;
  leidaEn: Date | null;
  createdAt: Date;
  notificacion: { tipo: 'manual' | 'automatica'; prioridad: 'normal' | 'importante'; evento: string | null; params: unknown; titulo: string | null; mensaje: string | null };
}

/**
 * A dónde lleva un aviso (FR-003): el destino del catálogo si es automático,
 * su pantalla completa si es manual. Un evento que ya no está en el catálogo,
 * o con `params` que no le alcanzan, lleva al aviso completo (nunca se rompe la lista).
 */
export function destinoDeAviso(entregaId: string, n: Pick<FilaEntrega['notificacion'], 'tipo' | 'evento' | 'params'>): string {
  const propio = `/avisos/${entregaId}`;
  if (n.tipo === 'manual' || !n.evento || !(n.evento in CATALOGO_AVISOS)) return propio;
  try {
    const destino = (CATALOGO_AVISOS[n.evento as NombreEventoAviso].destino as (d: unknown) => string)(n.params ?? {});
    return destino.startsWith('/') && !destino.startsWith('//') ? destino : propio;
  } catch {
    return propio;
  }
}

function resumen(e: FilaEntrega): AvisoResumen {
  const n = e.notificacion;
  const manual = n.tipo === 'manual';
  return {
    id: e.id,
    tipo: n.tipo,
    evento: manual ? null : (n.evento as NombreEventoAviso),
    params: manual ? null : ((n.params ?? {}) as AvisoResumen['params']),
    titulo: manual ? n.titulo : null,
    extracto: manual && n.mensaje ? extractoDe(n.mensaje) : null,
    importante: n.prioridad === 'importante',
    leido: e.leidaEn !== null,
    fecha: e.createdAt.toISOString(),
    destino: destinoDeAviso(e.id, n),
  };
}

/**
 * spec 012, lote A (contracts/avisos-api.md, FR-001–FR-008) — los avisos de la
 * Persona de la sesión. El id de un aviso es el de su Entrega `app`; todo
 * filtra por `personaId` y `canal = app` (Principio V): el aviso de otra
 * Persona responde igual que uno que no existe.
 */
@Injectable()
export class AvisosService {
  constructor(private readonly prisma: PrismaService) {}

  /** `pagina` fuera de rango se recorta a la válida más cercana (docs/15 §Listados paginados). */
  async listar(personaId: string, pagina: number): Promise<Pagina<AvisoResumen> & { pagina: number }> {
    const where = { personaId, canal: 'app' as const };
    const total = await this.prisma.entregaNotificacion.count({ where });
    const totalPaginas = Math.max(1, Math.ceil(total / AVISOS_POR_PAGINA));
    const valida = Math.min(Math.max(1, Math.trunc(pagina) || 1), totalPaginas);
    const filas = await this.prisma.entregaNotificacion.findMany({
      where,
      select: SELECT_ENTREGA,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (valida - 1) * AVISOS_POR_PAGINA,
      take: AVISOS_POR_PAGINA,
    });
    return { items: filas.map(resumen), total, pagina: valida };
  }

  /** FR-005 — usa el índice parcial `entregas_sin_leer`. */
  async sinLeer(personaId: string): Promise<{ cantidad: number }> {
    const cantidad = await this.prisma.entregaNotificacion.count({ where: { personaId, canal: 'app', leidaEn: null } });
    return { cantidad };
  }

  async detalle(personaId: string, id: string): Promise<AvisoDetalle> {
    const e = await this.prisma.entregaNotificacion.findFirst({ where: { id, personaId, canal: 'app' }, select: SELECT_ENTREGA });
    if (!e) throw new AppException('NO_ENCONTRADO', 404, 'No encontramos ese aviso.');
    return { ...resumen(e), mensaje: e.notificacion.tipo === 'manual' ? e.notificacion.mensaje : null };
  }

  /** FR-003, FR-008 — idempotente: la primera `leidaEn` no se pisa. */
  async marcarLeido(personaId: string, id: string): Promise<{ destino: string }> {
    await this.prisma.entregaNotificacion.updateMany({ where: { id, personaId, canal: 'app', leidaEn: null }, data: { leidaEn: new Date() } });
    const e = await this.prisma.entregaNotificacion.findFirst({
      where: { id, personaId, canal: 'app' },
      select: { id: true, notificacion: { select: { tipo: true, evento: true, params: true } } },
    });
    if (!e) throw new AppException('NO_ENCONTRADO', 404, 'No encontramos ese aviso.');
    return { destino: destinoDeAviso(e.id, e.notificacion) };
  }

  /** FR-004 — un solo UPDATE; nunca toca las Entregas de otra Persona. */
  async leerTodos(personaId: string): Promise<{ marcados: number }> {
    const { count } = await this.prisma.entregaNotificacion.updateMany({ where: { personaId, canal: 'app', leidaEn: null }, data: { leidaEn: new Date() } });
    return { marcados: count };
  }
}
