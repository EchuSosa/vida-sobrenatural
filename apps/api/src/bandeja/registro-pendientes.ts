import { Injectable } from '@nestjs/common';
import type { LineaPendienteAdmin } from '@vida-sobrenatural/shared-types';

/** Una fila de la tarjeta "Pendientes" del Inicio del backoffice, contada por su spec. */
export interface FuentePendienteAdmin {
  /** `inicio.pendientes.extra.<clave>` en el backoffice: solo letras, números y `_`. */
  readonly clave: string;
  readonly enlace: string;
  contar(ahora: Date): Promise<number>;
}

/**
 * Lote 0 global — las specs 006–011 suman filas a la tarjeta "Pendientes"
 * (specs/004, FR-048) sin editar `PendientesAdminService`: cada módulo
 * registra su fuente en `onModuleInit`, igual que las de la bandeja.
 */
@Injectable()
export class RegistroPendientesAdmin {
  private readonly fuentes: FuentePendienteAdmin[] = [];

  registrar(fuente: FuentePendienteAdmin): void {
    if (!/^[a-z0-9_]+$/.test(fuente.clave)) throw new Error(`Clave de pendiente inválida: "${fuente.clave}".`);
    if (this.fuentes.some((f) => f.clave === fuente.clave)) throw new Error(`Ya hay un pendiente "${fuente.clave}".`);
    this.fuentes.push(fuente);
  }

  async lineas(ahora: Date): Promise<LineaPendienteAdmin[]> {
    const lineas = await Promise.all(
      this.fuentes.map(async (f) => ({ clave: f.clave, enlace: f.enlace, cantidad: await f.contar(ahora) })),
    );
    return lineas.filter((l) => l.cantidad > 0);
  }
}
