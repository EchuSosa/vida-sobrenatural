import { CodigoIngresoService } from '../../../src/codigo-ingreso/codigo-ingreso.service.js';
import { huella } from '../../../src/codigo-ingreso/huella.js';
import type { PrismaService } from '../../../src/prisma/prisma.service.js';
import type { AppException } from '../../../src/common/errors/app-exception.js';
import { EmailServiceFalso } from '../../email-service-falso.js';

/**
 * spec 007, T016 — reglas del pedido y la verificación con un Prisma en
 * memoria (solo la tabla `codigos_ingreso`, con los filtros que usa el
 * servicio) y `EmailServiceFalso` (FR-021: nunca un mail real).
 */
interface Fila {
  id: string;
  email: string;
  codigoHuella: string;
  origenHuella: string;
  venceEn: Date;
  intentosFallidos: number;
  usadoEn: Date | null;
  reemplazadoEn: Date | null;
  creadoEn: Date;
}

type Filtro = Record<string, unknown>;

function cumple(fila: Fila, where: Filtro): boolean {
  return Object.entries(where).every(([campo, condicion]) => {
    const valor = fila[campo as keyof Fila];
    if (condicion === null) return valor === null;
    if (condicion instanceof Date) return valor instanceof Date && valor.getTime() === condicion.getTime();
    if (typeof condicion === 'object') {
      const c = condicion as { gt?: Date | number; lt?: Date | number };
      const v = valor instanceof Date ? valor.getTime() : (valor as number);
      const n = (x: Date | number) => (x instanceof Date ? x.getTime() : x);
      if (c.gt !== undefined && !(v > n(c.gt))) return false;
      if (c.lt !== undefined && !(v < n(c.lt))) return false;
      return true;
    }
    return valor === condicion;
  });
}

function prismaEnMemoria() {
  const filas: Fila[] = [];
  let siguiente = 1;
  const personaTocada = jest.fn();
  const codigoIngreso = {
    count: async ({ where }: { where: Filtro }) => filas.filter((f) => cumple(f, where)).length,
    findFirst: async ({ where, orderBy }: { where: Filtro; orderBy?: { creadoEn: 'asc' | 'desc' } }) => {
      const encontradas = filas.filter((f) => cumple(f, where));
      encontradas.sort((a, b) => (orderBy?.creadoEn === 'desc' ? -1 : 1) * (a.creadoEn.getTime() - b.creadoEn.getTime()));
      return encontradas[0] ?? null;
    },
    findUnique: async ({ where }: { where: { id: string } }) => filas.find((f) => f.id === where.id) ?? null,
    create: async ({ data }: { data: Omit<Fila, 'id' | 'intentosFallidos' | 'usadoEn' | 'reemplazadoEn'> }) => {
      const fila: Fila = { id: String(siguiente++), intentosFallidos: 0, usadoEn: null, reemplazadoEn: null, ...data };
      filas.push(fila);
      return fila;
    },
    updateMany: async ({ where, data }: { where: Filtro; data: Record<string, unknown> }) => {
      const afectadas = filas.filter((f) => cumple(f, where));
      for (const f of afectadas) {
        for (const [campo, valor] of Object.entries(data)) {
          if (valor && typeof valor === 'object' && 'increment' in valor) {
            (f as unknown as Record<string, number>)[campo] += (valor as { increment: number }).increment;
          } else {
            (f as unknown as Record<string, unknown>)[campo] = valor;
          }
        }
      }
      return { count: afectadas.length };
    },
    deleteMany: async ({ where }: { where: Filtro }) => {
      const antes = filas.length;
      for (let i = filas.length - 1; i >= 0; i--) if (cumple(filas[i], where)) filas.splice(i, 1);
      return { count: antes - filas.length };
    },
  };
  const persona = new Proxy({}, { get: () => personaTocada });
  const prisma = {
    codigoIngreso,
    persona,
    $transaction: (fn: (tx: unknown) => unknown) => fn({ codigoIngreso, persona }),
  };
  return { prisma: prisma as unknown as PrismaService, filas, personaTocada };
}

const MIN = 60 * 1000;
const T0 = new Date('2026-10-08T12:00:00Z');
const en = (minutos: number) => new Date(T0.getTime() + minutos * MIN);

function codigoDe(email: EmailServiceFalso): string {
  const ultimo = email.enviados.at(-1);
  return /(\d{6})/.exec(ultimo!.asunto)![1];
}

async function error(promesa: Promise<unknown>): Promise<AppException> {
  try {
    await promesa;
  } catch (e) {
    return e as AppException;
  }
  throw new Error('Se esperaba un error');
}

describe('CodigoIngresoService', () => {
  let email: EmailServiceFalso;
  let db: ReturnType<typeof prismaEnMemoria>;
  let service: CodigoIngresoService;

  beforeAll(() => {
    process.env.CODIGO_INGRESO_SECRET = 'secreto-de-prueba';
  });

  beforeEach(() => {
    email = new EmailServiceFalso();
    db = prismaEnMemoria();
    service = new CodigoIngresoService(db.prisma, email);
  });

  describe('pedir', () => {
    it('normaliza el email, manda el mail y nunca guarda el código ni la IP en claro', async () => {
      await service.pedir('  ANA@Hotmail.com ', '10.0.0.1', T0);
      expect(email.enviados).toHaveLength(1);
      expect(email.enviados[0].para).toBe('ana@hotmail.com');
      const codigo = codigoDe(email);
      expect(db.filas).toHaveLength(1);
      expect(db.filas[0].email).toBe('ana@hotmail.com');
      expect(db.filas[0].codigoHuella).toBe(huella(codigo));
      expect(JSON.stringify(db.filas)).not.toContain(codigo);
      expect(JSON.stringify(db.filas)).not.toContain('10.0.0.1');
      expect(db.filas[0].venceEn).toEqual(en(15));
    });

    it('nunca consulta Persona (misma respuesta para cualquier email)', async () => {
      await service.pedir('registrada@example.com', 'ip', T0);
      await service.pedir('nadie@example.com', 'ip', T0);
      expect(db.personaTocada).not.toHaveBeenCalled();
    });

    it('rechaza un email con formato inválido o de más de 254 caracteres', async () => {
      for (const malo of ['', 'ana', 'ana@', `${'a'.repeat(250)}@x.com`, 42]) {
        const e = await error(service.pedir(malo, 'ip', T0));
        expect(e.code).toBe('VALIDACION');
        expect(e.errors).toEqual([{ campo: 'email', code: 'EMAIL_INVALIDO' }]);
      }
      expect(email.enviados).toHaveLength(0);
    });

    it('límite por email: el 5.º pedido de la hora pasa, el 6.º no, y dice cuándo reintentar', async () => {
      for (let i = 0; i < 5; i++) await service.pedir('ana@hotmail.com', `ip-${i}`, en(i));
      const e = await error(service.pedir('ana@hotmail.com', 'ip-5', en(10)));
      expect(e.code).toBe('DEMASIADOS_PEDIDOS');
      expect(e.getStatus()).toBe(429);
      expect(e.errors).toEqual([{ campo: 'email', code: 'DEMASIADOS_PEDIDOS' }]);
      // El más viejo (minuto 0) sale de la ventana en el minuto 60: faltan 50 minutos.
      expect(e.extensiones).toEqual({ reintentarEn: 50 * 60 });
      // Pasada la hora del primero, vuelve a poder.
      await expect(service.pedir('ana@hotmail.com', 'ip-6', en(60.5))).resolves.toBeUndefined();
    });

    it('límite por origen: 30 por hora desde la misma IP, con emails distintos', async () => {
      for (let i = 0; i < 30; i++) await service.pedir(`p${i}@example.com`, '10.0.0.9', en(1));
      const e = await error(service.pedir('otra@example.com', '10.0.0.9', en(2)));
      expect(e.code).toBe('DEMASIADOS_PEDIDOS');
      await expect(service.pedir('otra@example.com', '10.0.0.10', en(2))).resolves.toBeUndefined();
    });

    it('un envío fallido no cuenta contra el límite y responde ENVIO_EMAIL_FALLIDO', async () => {
      email.fallarLosProximos(3);
      for (let i = 0; i < 3; i++) {
        const e = await error(service.pedir('ana@hotmail.com', 'ip', en(i)));
        expect(e.code).toBe('ENVIO_EMAIL_FALLIDO');
        expect(e.getStatus()).toBe(503);
      }
      expect(db.filas).toHaveLength(0);
      for (let i = 0; i < 5; i++) await service.pedir('ana@hotmail.com', 'ip', en(5 + i));
      expect(email.enviados).toHaveLength(5);
    });

    it('borra lo que tiene más de 24 horas', async () => {
      await service.pedir('vieja@example.com', 'ip', T0);
      await service.pedir('nueva@example.com', 'ip', en(24 * 60 + 1));
      expect(db.filas.map((f) => f.email)).toEqual(['nueva@example.com']);
    });
  });

  describe('verificar', () => {
    it('código correcto: devuelve el email normalizado y sirve una sola vez', async () => {
      await service.pedir('ana@hotmail.com', 'ip', T0);
      const codigo = codigoDe(email);
      await expect(service.verificar('ANA@hotmail.com', `${codigo.slice(0, 3)} ${codigo.slice(3)}`, en(1))).resolves.toEqual({
        email: 'ana@hotmail.com',
      });
      expect((await error(service.verificar('ana@hotmail.com', codigo, en(2)))).code).toBe('CODIGO_VENCIDO');
    });

    it('vence a los 15 minutos', async () => {
      await service.pedir('ana@hotmail.com', 'ip', T0);
      const codigo = codigoDe(email);
      expect((await error(service.verificar('ana@hotmail.com', codigo, en(15)))).code).toBe('CODIGO_VENCIDO');
    });

    it('el código anterior queda reemplazado por el nuevo', async () => {
      await service.pedir('ana@hotmail.com', 'ip', T0);
      const viejo = codigoDe(email);
      await service.pedir('ana@hotmail.com', 'ip', en(1));
      const nuevo = codigoDe(email);
      if (viejo !== nuevo) {
        const e = await error(service.verificar('ana@hotmail.com', viejo, en(2)));
        expect(e.code).toBe('CODIGO_INCORRECTO');
      }
      await expect(service.verificar('ana@hotmail.com', nuevo, en(2))).resolves.toEqual({ email: 'ana@hotmail.com' });
      expect(db.filas.find((f) => f.creadoEn.getTime() === T0.getTime())?.reemplazadoEn).toEqual(en(1));
    });

    it('nunca pedido → CODIGO_VENCIDO', async () => {
      const e = await error(service.verificar('nadie@example.com', '123456', T0));
      expect(e.code).toBe('CODIGO_VENCIDO');
      expect(e.errors).toEqual([{ campo: 'codigo', code: 'CODIGO_VENCIDO' }]);
    });

    it('cinco intentos: avisa los que quedan y al quinto deja de servir (aunque después llegue el correcto)', async () => {
      await service.pedir('ana@hotmail.com', 'ip', T0);
      const codigo = codigoDe(email);
      const equivocado = codigo === '000000' ? '111111' : '000000';
      for (let restantes = 4; restantes >= 1; restantes--) {
        const e = await error(service.verificar('ana@hotmail.com', equivocado, en(1)));
        expect(e.code).toBe('CODIGO_INCORRECTO');
        expect(e.extensiones).toEqual({ intentosRestantes: restantes });
        expect(e.errors).toEqual([{ campo: 'codigo', code: 'CODIGO_INCORRECTO' }]);
      }
      const quinto = await error(service.verificar('ana@hotmail.com', equivocado, en(1)));
      expect(quinto.code).toBe('CODIGO_SIN_INTENTOS');
      expect((await error(service.verificar('ana@hotmail.com', codigo, en(1)))).code).toBe('CODIGO_VENCIDO');
    });

    it('formato inválido: errores por campo, sin gastar intentos', async () => {
      await service.pedir('ana@hotmail.com', 'ip', T0);
      const e = await error(service.verificar('ana', '48291', en(1)));
      expect(e.code).toBe('VALIDACION');
      expect(e.errors).toEqual([
        { campo: 'email', code: 'EMAIL_INVALIDO' },
        { campo: 'codigo', code: 'CODIGO_INVALIDO' },
      ]);
      expect(db.filas[0].intentosFallidos).toBe(0);
    });
  });
});
