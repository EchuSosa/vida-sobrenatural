import { Injectable, Logger } from '@nestjs/common';
import {
  CODIGO_INGRESO_ENVIOS_POR_EMAIL_HORA,
  CODIGO_INGRESO_ENVIOS_POR_ORIGEN_HORA,
  CODIGO_INGRESO_MAX_INTENTOS,
  CODIGO_INGRESO_VIDA_MIN,
  normalizarEmail,
} from '@vida-sobrenatural/shared-types';
import { PrismaService } from '../prisma/prisma.service.js';
import { EmailService } from '../email/email.service.js';
import { plantillaCodigoIngreso } from '../email/plantillas/codigo-ingreso.js';
import { AppException } from '../common/errors/app-exception.js';
import { coincide, generarCodigo, huella, limpiarCodigo } from './huella.js';

const HORA_MS = 60 * 60 * 1000;
const RETENCION_MS = 24 * HORA_MS;
/** Formato mínimo de un email (el mismo criterio que el alta de Personas). */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_MAX = 254;

/**
 * spec 007 (T015, research.md #5, contracts/codigo-ingreso-api.md) — pedir y
 * verificar el código de ingreso.
 *
 * `pedir` **nunca** consulta `Persona`: la respuesta (y el tiempo de
 * respuesta) es la misma para cualquier email, registrado o no (FR-008). La
 * verificación tampoco decide quién entra: solo confirma que el email es de
 * quien escribe el código; el resto lo decide el callback `signIn` de cada app.
 *
 * Nada de lo que identifica a alguien (email, código, IP) va a logs (FR-020).
 */
@Injectable()
export class CodigoIngresoService {
  private readonly logger = new Logger('CodigoIngresoService');

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  async pedir(emailCrudo: unknown, origen: string, ahora: Date = new Date()): Promise<void> {
    const email = validarEmail(emailCrudo);
    const origenHuella = huella(origen);
    const haceUnaHora = new Date(ahora.getTime() - HORA_MS);

    // 1. Límites de envíos (FR-009): 5 por email y 30 por origen en la última hora.
    await this.revisarLimite({ email, creadoEn: { gt: haceUnaHora } }, CODIGO_INGRESO_ENVIOS_POR_EMAIL_HORA, ahora);
    await this.revisarLimite({ origenHuella, creadoEn: { gt: haceUnaHora } }, CODIGO_INGRESO_ENVIOS_POR_ORIGEN_HORA, ahora);

    // 2. El código nuevo reemplaza al vigente (FR-005), en una transacción.
    const codigo = generarCodigo();
    const nueva = await this.prisma.$transaction(async (tx) => {
      await tx.codigoIngreso.updateMany({
        where: { email, usadoEn: null, reemplazadoEn: null },
        data: { reemplazadoEn: ahora },
      });
      return tx.codigoIngreso.create({
        data: {
          email,
          codigoHuella: huella(codigo),
          origenHuella,
          venceEn: new Date(ahora.getTime() + CODIGO_INGRESO_VIDA_MIN * 60 * 1000),
          creadoEn: ahora,
        },
        select: { id: true },
      });
    });

    // 3. El mail. Si falla, el pedido no cuenta contra el límite: se borra la fila.
    try {
      await this.email.enviar({ para: email, ...plantillaCodigoIngreso({ codigo, minutos: CODIGO_INGRESO_VIDA_MIN }) });
    } catch {
      await this.prisma.codigoIngreso.deleteMany({ where: { id: nueva.id } });
      this.logger.warn({ evento: 'codigo_ingreso_envio_fallido' });
      throw new AppException('ENVIO_EMAIL_FALLIDO', 503, 'No se pudo enviar el mail con el código.');
    }

    // 4. Limpieza: nada queda guardado más de 24 horas.
    await this.prisma.codigoIngreso.deleteMany({ where: { creadoEn: { lt: new Date(ahora.getTime() - RETENCION_MS) } } });
  }

  async verificar(emailCrudo: unknown, codigoCrudo: unknown, ahora: Date = new Date()): Promise<{ email: string }> {
    const errores: Array<{ campo: string; code: 'EMAIL_INVALIDO' | 'CODIGO_INVALIDO' }> = [];
    const email = emailValido(emailCrudo);
    if (!email) errores.push({ campo: 'email', code: 'EMAIL_INVALIDO' });
    const codigo = limpiarCodigo(codigoCrudo);
    if (!codigo) errores.push({ campo: 'codigo', code: 'CODIGO_INVALIDO' });
    if (!email || !codigo) throw new AppException('VALIDACION', 400, 'Uno o más campos no son válidos.', errores);

    const vigente = await this.prisma.codigoIngreso.findFirst({
      where: {
        email,
        usadoEn: null,
        reemplazadoEn: null,
        venceEn: { gt: ahora },
        intentosFallidos: { lt: CODIGO_INGRESO_MAX_INTENTOS },
      },
      orderBy: { creadoEn: 'desc' },
      select: { id: true, codigoHuella: true },
    });
    if (!vigente) throw codigoVencido();

    if (!coincide(codigo, vigente.codigoHuella)) {
      // Incremento atómico: dos intentos simultáneos no pasan del máximo.
      const { count } = await this.prisma.codigoIngreso.updateMany({
        where: { id: vigente.id, intentosFallidos: { lt: CODIGO_INGRESO_MAX_INTENTOS } },
        data: { intentosFallidos: { increment: 1 } },
      });
      if (count === 0) throw codigoVencido();
      const actualizado = await this.prisma.codigoIngreso.findUnique({ where: { id: vigente.id }, select: { intentosFallidos: true } });
      const intentosRestantes = Math.max(0, CODIGO_INGRESO_MAX_INTENTOS - (actualizado?.intentosFallidos ?? CODIGO_INGRESO_MAX_INTENTOS));
      if (intentosRestantes === 0) {
        throw new AppException('CODIGO_SIN_INTENTOS', 422, 'Se probó demasiadas veces con este código.', [
          { campo: 'codigo', code: 'CODIGO_SIN_INTENTOS' },
        ]);
      }
      throw new AppException('CODIGO_INCORRECTO', 422, 'El código no coincide.', [{ campo: 'codigo', code: 'CODIGO_INCORRECTO' }], {
        intentosRestantes,
      });
    }

    // Correcto: sirve una sola vez (FR-004). Atómico contra un uso simultáneo.
    const { count } = await this.prisma.codigoIngreso.updateMany({
      where: { id: vigente.id, usadoEn: null, reemplazadoEn: null },
      data: { usadoEn: ahora },
    });
    if (count === 0) throw codigoVencido();
    return { email };
  }

  private async revisarLimite(
    where: { email?: string; origenHuella?: string; creadoEn: { gt: Date } },
    maximo: number,
    ahora: Date,
  ): Promise<void> {
    const cantidad = await this.prisma.codigoIngreso.count({ where });
    if (cantidad < maximo) return;
    // Se libera un lugar cuando el pedido más viejo de la ventana cumple una hora.
    const masViejo = await this.prisma.codigoIngreso.findFirst({ where, orderBy: { creadoEn: 'asc' }, select: { creadoEn: true } });
    const liberaEn = (masViejo?.creadoEn.getTime() ?? ahora.getTime()) + HORA_MS;
    const reintentarEn = Math.max(1, Math.ceil((liberaEn - ahora.getTime()) / 1000));
    throw new AppException(
      'DEMASIADOS_PEDIDOS',
      429,
      'Se pidieron demasiados códigos seguidos.',
      [{ campo: 'email', code: 'DEMASIADOS_PEDIDOS' }],
      { reintentarEn },
    );
  }
}

function emailValido(valor: unknown): string | null {
  if (typeof valor !== 'string') return null;
  const email = normalizarEmail(valor);
  return email.length <= EMAIL_MAX && EMAIL.test(email) ? email : null;
}

function validarEmail(valor: unknown): string {
  const email = emailValido(valor);
  if (!email) {
    throw new AppException('VALIDACION', 400, 'Uno o más campos no son válidos.', [{ campo: 'email', code: 'EMAIL_INVALIDO' }]);
  }
  return email;
}

function codigoVencido() {
  return new AppException('CODIGO_VENCIDO', 422, 'No hay un código vigente para este email.', [{ campo: 'codigo', code: 'CODIGO_VENCIDO' }]);
}
