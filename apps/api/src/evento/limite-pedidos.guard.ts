import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { AppException } from '../common/errors/app-exception.js';

/** Pedidos por minuto por Persona para anotarse o subir un comprobante. */
export const LIMITE_ESCRITURA_POR_MINUTO = 20;
const VENTANA_MS = 60_000;

/**
 * spec 011, T019 (research #10, `docs/13`): límite de pedidos para lo que
 * escribe la Persona (anotarse, subir un comprobante). Se cuenta por Persona,
 * no por IP: detrás del servidor de la web todas las IP son la misma. El
 * rechazo sale con nuestro formato, `DEMASIADOS_PEDIDOS` (429).
 *
 * Ventana deslizante en memoria del proceso (alcanza con una sola instancia
 * de la API, D75). No usa `@nestjs/throttler`: es CommonJS y requiere
 * `@nestjs/common` (ESM desde la v12), cosa que la suite de integración en
 * modo ESM de Jest no puede cargar. Va después de `JwtNextAuthGuard`.
 */
@Injectable()
export class LimitePedidosGuard implements CanActivate {
  private readonly pedidos = new Map<string, number[]>();

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{ user?: { personaId?: string | null; email?: string }; ip?: string; route?: { path?: string } }>();
    const quien = req.user?.personaId ?? req.user?.email ?? req.ip ?? 'anonimo';
    const clave = `${req.route?.path ?? ''}|${quien}`;
    const ahora = Date.now();
    const recientes = (this.pedidos.get(clave) ?? []).filter((t) => ahora - t < VENTANA_MS);
    if (recientes.length >= LIMITE_ESCRITURA_POR_MINUTO) {
      this.pedidos.set(clave, recientes);
      throw new AppException('DEMASIADOS_PEDIDOS', 429, 'Hiciste muchos pedidos seguidos. Esperá un minuto y probá de nuevo.');
    }
    recientes.push(ahora);
    this.pedidos.set(clave, recientes);
    if (this.pedidos.size > 10_000) this.limpiar(ahora);
    return true;
  }

  private limpiar(ahora: number) {
    for (const [clave, tiempos] of this.pedidos) if (tiempos.every((t) => ahora - t >= VENTANA_MS)) this.pedidos.delete(clave);
  }
}
