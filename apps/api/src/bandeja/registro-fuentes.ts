import { Injectable } from '@nestjs/common';
import type { TipoSolicitud } from '@vida-sobrenatural/shared-types';
import type { FuenteSolicitudes } from './fuente-solicitudes.js';

/**
 * Las fuentes conectadas. Un tipo sin fuente no aparece en la bandeja ni en
 * el conteo, aunque la vista ya tenga su rama ("solo tipos conectados").
 */
@Injectable()
export class RegistroFuentesSolicitudes {
  private readonly fuentes = new Map<TipoSolicitud, FuenteSolicitudes>();

  registrar(fuente: FuenteSolicitudes): void {
    if (this.fuentes.has(fuente.tipo)) throw new Error(`Ya hay una FuenteSolicitudes para "${fuente.tipo}".`);
    this.fuentes.set(fuente.tipo, fuente);
  }

  fuente(tipo: TipoSolicitud): FuenteSolicitudes | undefined {
    return this.fuentes.get(tipo);
  }

  conectados(): TipoSolicitud[] {
    return [...this.fuentes.keys()];
  }
}
