import type { PrismaService } from '../../src/prisma/prisma.service.js';
import { Escenario } from './discipulado-fixtures.js';
import { EscenarioEventos } from './eventos-fixtures.js';

export { levantarApp, tokenDe } from './discipulado-fixtures.js';
export { AYER, EN_UN_MES } from './eventos-fixtures.js';

/**
 * spec 010 — constructores por Prisma para los tests de integración de
 * Bautismo: Personas con Vida Nueva en curso, completada o ninguna (por el
 * Escenario de la 004) y Eventos de bautismo (por el de la 011, E8). Limpia
 * primero lo propio (Solicitudes de Bautismo, avisos, Completitudes) y
 * después delega en los dos escenarios.
 */
export class EscenarioBautismo {
  readonly disc: Escenario;
  readonly eventos: EscenarioEventos;
  private discipuladorId = '';
  private adminId = '';
  private readonly personas: string[] = [];

  constructor(
    private readonly prisma: PrismaService,
    readonly sufijo: string,
  ) {
    this.disc = new Escenario(prisma, `bau${sufijo}`);
    this.eventos = new EscenarioEventos(prisma, `bau${sufijo}`);
  }

  async preparar(): Promise<{ adminId: string }> {
    await this.disc.preparar();
    await this.eventos.preparar();
    this.adminId = await this.disc.persona('admin', { rol: ['miembro_registrado', 'admin'] });
    this.discipuladorId = await this.disc.discipulador('discipuladora');
    this.personas.push(this.adminId, this.discipuladorId);
    return { adminId: this.adminId };
  }

  /** Una Persona con su situación de Vida Nueva (D147) y, si se pide, su edad. */
  async persona(
    clave: string,
    opciones: { vidaNueva?: 'en_curso' | 'completada' | 'ninguna'; edad?: number; rol?: string[]; sinEmail?: boolean } = {},
  ): Promise<string> {
    const fechaNacimiento = opciones.edad === undefined ? undefined : haceAnios(opciones.edad);
    const id = await this.disc.persona(clave, { rol: opciones.rol, fechaNacimiento });
    this.personas.push(id);
    if (opciones.sinEmail) await this.prisma.persona.update({ where: { id }, data: { email: null } });
    const vn = opciones.vidaNueva ?? 'en_curso';
    if (vn !== 'ninguna') {
      const { inscripciones } = await this.disc.grupo(this.discipuladorId, [id], this.adminId);
      if (vn === 'completada') await this.prisma.inscripcion.update({ where: { id: inscripciones[0] }, data: { estado: 'completada' } });
    }
    return id;
  }

  /** Un Evento de bautismo (E8): futuro por defecto. */
  eventoBautismo(datos: { inicio?: Date; estado?: 'publicado' | 'cancelado'; lugar?: string | null } = {}) {
    return this.eventos.evento({ tipo: 'bautismo', ...datos });
  }

  solicitud(personaId: string, estado: 'pendiente' | 'aprobada' | 'rechazada' | 'retirada' = 'pendiente') {
    return this.prisma.solicitudBautismo.create({
      data: {
        personaId,
        estado,
        ...(estado !== 'pendiente' ? { revisadoPorId: this.adminId, revisadaEn: new Date() } : {}),
        ...(estado === 'retirada' ? { retiradaEn: new Date() } : {}),
      },
      select: { id: true },
    });
  }

  /** Una Solicitud aceptada y asignada al Evento (con su Inscripción), sin pasar por la API. */
  async asignada(personaId: string, eventoId: string): Promise<{ id: string; inscripcionId: string }> {
    const { id } = await this.solicitud(personaId, 'aprobada');
    const inscripcion = await this.prisma.inscripcionEvento.create({
      data: { eventoId, personaId, estado: 'confirmada', creadoPorId: this.adminId },
      select: { id: true },
    });
    await this.prisma.solicitudBautismo.update({ where: { id }, data: { inscripcionEventoId: inscripcion.id } });
    return { id, inscripcionId: inscripcion.id };
  }

  /** Los avisos emitidos sobre una Solicitud (entidad relacionada, D197). */
  avisos(solicitudId: string) {
    return this.prisma.notificacion.findMany({
      where: { entidadTipo: 'solicitud_bautismo', entidadId: solicitudId },
      orderBy: { createdAt: 'asc' },
      select: { evento: true, params: true },
    });
  }

  async limpiar(): Promise<void> {
    const p = this.prisma;
    const ids = this.personas;
    const solicitudes = (await p.solicitudBautismo.findMany({ where: { personaId: { in: ids } }, select: { id: true } })).map((s) => s.id);
    const notificaciones = (
      await p.notificacion.findMany({ where: { OR: [{ entidadId: { in: solicitudes } }, { entregas: { some: { personaId: { in: ids } } } }] }, select: { id: true } })
    ).map((n) => n.id);
    await p.entregaNotificacion.deleteMany({ where: { OR: [{ notificacionId: { in: notificaciones } }, { personaId: { in: ids } }] } });
    await p.notificacion.deleteMany({ where: { id: { in: notificaciones } } });
    await p.solicitudBautismo.deleteMany({ where: { id: { in: solicitudes } } });
    await p.completitudManual.deleteMany({ where: { personaId: { in: ids } } });
    await p.declaracionHistorial.deleteMany({ where: { personaId: { in: ids } } });
    await p.inscripcionEvento.deleteMany({ where: { personaId: { in: ids } } });
    await this.eventos.limpiar();
    await this.disc.limpiar();
  }
}

function haceAnios(anios: number): Date {
  const d = new Date();
  d.setUTCFullYear(d.getUTCFullYear() - anios);
  d.setUTCDate(d.getUTCDate() - 10);
  return d;
}
