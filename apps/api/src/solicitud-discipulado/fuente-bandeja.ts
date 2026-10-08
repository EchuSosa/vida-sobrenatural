import { Injectable, type OnModuleInit } from '@nestjs/common';
import { esAbierta, type ExtraBandejaDiscipulado, type SolicitudBandeja } from '@vida-sobrenatural/shared-types';
import type { FuenteSolicitudes } from '../bandeja/fuente-solicitudes.js';
import { RegistroFuentesSolicitudes } from '../bandeja/registro-fuentes.js';
import { SolicitudDiscipuladoService } from './solicitud-discipulado.service.js';

/**
 * spec 013, T021 (contracts/bandeja-api.md, paso 3): Discipulado (004) como
 * fuente de la bandeja unificada. Las filas salen de los mismos `resumenes`
 * que el detalle; la propuesta vigente viaja en `extra` para que la bandeja
 * siga diciendo "propuesta a X, hace N días" (FR-008).
 */
@Injectable()
export class FuenteBandejaDiscipulado implements FuenteSolicitudes, OnModuleInit {
  readonly tipo = 'discipulado' as const;

  constructor(
    private readonly solicitudes: SolicitudDiscipuladoService,
    private readonly registro: RegistroFuentesSolicitudes,
  ) {}

  onModuleInit(): void {
    this.registro.registrar(this);
  }

  async resumenes(ids: readonly string[]): Promise<SolicitudBandeja[]> {
    return (await this.solicitudes.resumenes(ids)).map((s) => {
      const extra: ExtraBandejaDiscipulado = s.propuestaVigente ? { propuestaVigente: s.propuestaVigente } : {};
      return {
        tipo: this.tipo,
        id: s.id,
        persona: s.persona,
        estado: s.estado,
        abierta: esAbierta(this.tipo, s.estado),
        createdAt: s.createdAt,
        // Igual que la vista: la espera de una `propuesta` cuenta desde la propuesta vigente.
        esperaDesde: s.propuestaVigente?.propuestaEn ?? s.createdAt,
        creadoPor: s.creadoPor,
        revisadoPor: s.revisadoPor,
        revisadaEn: s.revisadaEn,
        extra,
      };
    });
  }
}
