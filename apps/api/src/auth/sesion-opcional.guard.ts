import { ExecutionContext, Injectable } from '@nestjs/common';
import { JwtNextAuthGuard } from './jwt-nextauth.guard.js';

/**
 * spec 013 (T060): para los endpoints que aceptan pedidos con y sin sesión
 * ("Contanos qué te parece"). Sin `Authorization`, deja pasar sin `user`; si
 * viene un token, lo verifica igual que `JwtNextAuthGuard` (uno vencido o
 * falso es 401, no "sin sesión": así nadie queda sin los campos de contacto
 * que la pantalla le ocultó por tener sesión).
 */
@Injectable()
export class SesionOpcionalGuard extends JwtNextAuthGuard {
  override async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ headers: { authorization?: string } }>();
    if (!request.headers.authorization) return true;
    return super.canActivate(context);
  }
}
