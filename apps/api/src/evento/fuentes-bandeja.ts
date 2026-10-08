import { Injectable, type OnModuleInit } from '@nestjs/common';
import { esAbierta, type SolicitudBandeja } from '@vida-sobrenatural/shared-types';
import { PrismaService } from '../prisma/prisma.service.js';
import type { FuenteSolicitudes } from '../bandeja/fuente-solicitudes.js';
import { RegistroFuentesSolicitudes } from '../bandeja/registro-fuentes.js';
import { RegistroPendientesAdmin } from '../bandeja/registro-pendientes.js';

/** Lo que Eventos suma en `extra` de la bandeja: el Evento y, para un Pago, monto y medio. */
export type ExtraBandejaEvento = {
  evento: { id: string; nombre: string; inicio: string };
  monto?: string;
  medio?: string;
};

type Breve = { id: string; nombre: string; apellido: string };

async function personasPorId(prisma: PrismaService, ids: Array<string | null>): Promise<Map<string, Breve>> {
  const unicos = [...new Set(ids.filter((x): x is string => Boolean(x)))];
  const filas = await prisma.persona.findMany({ where: { id: { in: unicos } }, select: { id: true, nombre: true, apellido: true } });
  return new Map(filas.map((p) => [p.id, p]));
}

/**
 * spec 011, T072/T075 (D178, §2.3 del mapa) — las Inscripciones a Evento como
 * fuente de la bandeja. Las abiertas son las `pendiente` (Eventos con
 * aprobación, D196). El detalle vive en `solicitudes/inscripcion-evento/[id]`.
 */
@Injectable()
export class FuenteBandejaInscripcionEvento implements FuenteSolicitudes, OnModuleInit {
  readonly tipo = 'inscripcion_evento' as const;

  constructor(
    private readonly prisma: PrismaService,
    private readonly registro: RegistroFuentesSolicitudes,
    private readonly pendientes: RegistroPendientesAdmin,
  ) {}

  onModuleInit(): void {
    this.registro.registrar(this);
    // FR-034: "Inscripciones a Eventos por aprobar" en el Inicio del backoffice.
    this.pendientes.registrar({
      clave: 'eventos_inscripciones',
      enlace: '/solicitudes?tipo=inscripcion_evento',
      contar: () => this.prisma.inscripcionEvento.count({ where: { estado: 'pendiente', evento: { eliminadoEn: null } } }),
    });
  }

  async resumenes(ids: readonly string[]): Promise<SolicitudBandeja[]> {
    const filas = await this.prisma.inscripcionEvento.findMany({
      where: { id: { in: [...ids] } },
      select: {
        id: true,
        estado: true,
        createdAt: true,
        creadoPorId: true,
        revisadoPorId: true,
        revisadoEn: true,
        persona: { select: { id: true, nombre: true, apellido: true } },
        evento: { select: { id: true, nombre: true, inicio: true } },
      },
    });
    const personas = await personasPorId(this.prisma, filas.flatMap((f) => [f.creadoPorId, f.revisadoPorId]));
    const porId = new Map(filas.map((f) => [f.id, f]));
    return ids
      .map((id) => porId.get(id))
      .filter((f): f is NonNullable<typeof f> => Boolean(f))
      .map((f) => {
        const extra: ExtraBandejaEvento = { evento: { ...f.evento, inicio: f.evento.inicio.toISOString() } };
        return {
          tipo: this.tipo,
          id: f.id,
          persona: f.persona,
          estado: f.estado,
          abierta: esAbierta(this.tipo, f.estado),
          createdAt: f.createdAt.toISOString(),
          esperaDesde: f.createdAt.toISOString(),
          creadoPor: f.creadoPorId ? (personas.get(f.creadoPorId) ?? null) : null,
          revisadoPor: f.revisadoPorId ? (personas.get(f.revisadoPorId) ?? null) : null,
          revisadaEn: f.revisadoEn?.toISOString() ?? null,
          extra,
        };
      });
  }
}

/** spec 011, T067/T075 — los Pagos como fuente de la bandeja; abiertos, los que esperan verificación. */
@Injectable()
export class FuenteBandejaPago implements FuenteSolicitudes, OnModuleInit {
  readonly tipo = 'pago' as const;

  constructor(
    private readonly prisma: PrismaService,
    private readonly registro: RegistroFuentesSolicitudes,
    private readonly pendientes: RegistroPendientesAdmin,
  ) {}

  onModuleInit(): void {
    this.registro.registrar(this);
    // FR-034: "Pagos por verificar" en el Inicio del backoffice.
    this.pendientes.registrar({
      clave: 'eventos_pagos',
      enlace: '/solicitudes?tipo=pago',
      contar: () => this.prisma.pago.count({ where: { estado: 'pendiente_verificacion', inscripcionEvento: { evento: { eliminadoEn: null } } } }),
    });
  }

  async resumenes(ids: readonly string[]): Promise<SolicitudBandeja[]> {
    const filas = await this.prisma.pago.findMany({
      where: { id: { in: [...ids] } },
      select: {
        id: true,
        estado: true,
        monto: true,
        medio: true,
        createdAt: true,
        creadoPorId: true,
        verificadoPorId: true,
        revisadoEn: true,
        inscripcionEvento: {
          select: { persona: { select: { id: true, nombre: true, apellido: true } }, evento: { select: { id: true, nombre: true, inicio: true } } },
        },
      },
    });
    const personas = await personasPorId(this.prisma, filas.flatMap((f) => [f.creadoPorId, f.verificadoPorId]));
    const porId = new Map(filas.map((f) => [f.id, f]));
    return ids
      .map((id) => porId.get(id))
      .filter((f): f is NonNullable<typeof f> => Boolean(f))
      .map((f) => {
        const ev = f.inscripcionEvento.evento;
        const extra: ExtraBandejaEvento = { evento: { ...ev, inicio: ev.inicio.toISOString() }, monto: f.monto.toFixed(2), medio: f.medio };
        return {
          tipo: this.tipo,
          id: f.id,
          persona: f.inscripcionEvento.persona,
          estado: f.estado,
          abierta: esAbierta(this.tipo, f.estado),
          createdAt: f.createdAt.toISOString(),
          esperaDesde: f.createdAt.toISOString(),
          creadoPor: f.creadoPorId ? (personas.get(f.creadoPorId) ?? null) : null,
          revisadoPor: f.verificadoPorId ? (personas.get(f.verificadoPorId) ?? null) : null,
          revisadaEn: f.revisadoEn?.toISOString() ?? null,
          extra,
        };
      });
  }
}
