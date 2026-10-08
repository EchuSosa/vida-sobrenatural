import type { PrismaService } from '../../src/prisma/prisma.service.js';

/**
 * spec 009 — lo que los tests de integración de Ministerios agregan al
 * `Escenario` de la 004: crear Ministerios y Células con nombre único por
 * corrida, y borrar SUS filas (Postulaciones → Células → Ministerios, y los
 * avisos) ANTES de `escenario.limpiar()`. Única excepción al borrado lógico:
 * son datos de test (como `limpiar-e2e.ts`).
 */
export class Ministerios {
  private readonly ministerios: string[] = [];

  constructor(
    private readonly prisma: PrismaService,
    private readonly sufijo: string,
  ) {}

  async ministerio(
    nombre: string,
    opciones: {
      activo?: boolean;
      requiereFormacion?: boolean;
      celulas?: Array<
        | string
        | { nombre: string; activo?: boolean; ofreceRolDiscipulador?: boolean }
      >;
    } = {},
  ): Promise<{ id: string; nombre: string; celulas: Record<string, string> }> {
    const completo = `${nombre} ${this.sufijo}`;
    const m = await this.prisma.ministerio.create({
      data: {
        nombre: completo,
        descripcion: `Descripción de ${nombre}`,
        lineaPublica: `Línea de ${nombre}`,
        activo: opciones.activo ?? true,
        requiereFormacion: opciones.requiereFormacion ?? false,
      },
      select: { id: true },
    });
    this.ministerios.push(m.id);
    const celulas: Record<string, string> = {};
    for (const c of opciones.celulas ?? []) {
      const datos = typeof c === 'string' ? { nombre: c } : c;
      const creada = await this.prisma.celula.create({
        data: {
          ministerioId: m.id,
          nombre: datos.nombre,
          activo: datos.activo ?? true,
          ofreceRolDiscipulador: datos.ofreceRolDiscipulador ?? false,
        },
        select: { id: true },
      });
      celulas[datos.nombre] = creada.id;
    }
    return { id: m.id, nombre: completo, celulas };
  }

  /** Para los Ministerios que crea la API durante el test. */
  registrar(id: string): void {
    this.ministerios.push(id);
  }

  async limpiar(personaIds: string[]): Promise<void> {
    const p = this.prisma;
    const ministerios = [
      ...this.ministerios,
      ...(
        await p.ministerio.findMany({
          where: { nombre: { endsWith: this.sufijo } },
          select: { id: true },
        })
      ).map((m) => m.id),
    ];
    const postulaciones = (
      await p.postulacion.findMany({
        where: {
          OR: [
            { personaId: { in: personaIds } },
            { ministerioId: { in: ministerios } },
          ],
        },
        select: { id: true },
      })
    ).map((x) => x.id);
    await p.entregaNotificacion.deleteMany({
      where: { personaId: { in: personaIds } },
    });
    await p.notificacion.deleteMany({
      where: { entidadTipo: 'postulacion', entidadId: { in: postulaciones } },
    });
    await p.postulacion.deleteMany({ where: { id: { in: postulaciones } } });
    await p.celula.deleteMany({ where: { ministerioId: { in: ministerios } } });
    await p.ministerio.deleteMany({ where: { id: { in: ministerios } } });
  }
}

export const APTA = ['miembro_registrado', 'apto_ministerio'];
export const ADMIN = ['miembro_registrado', 'admin'];
export const PASTOR = ['miembro_registrado', 'pastor'];
