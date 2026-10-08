import type { Prisma } from '../../src/generated/prisma/client.js';
import type { PrismaService } from '../../src/prisma/prisma.service.js';

export { levantarApp, tokenDe } from './discipulado-fixtures.js';

/**
 * spec 011, T011 — constructores por Prisma para los tests de integración de
 * Eventos: una Sede propia, Personas, Eventos, Inscripciones y Pagos, y la
 * limpieza en orden de FK (Pago → InscripcionEvento → Evento → Persona → Sede).
 */
export const EN_UN_MES = () => new Date(Date.now() + 30 * 86_400_000);
export const AYER = () => new Date(Date.now() - 86_400_000);

export class EscenarioEventos {
  sedeId = '';
  private readonly personas: string[] = [];

  constructor(
    private readonly prisma: PrismaService,
    readonly sufijo: string,
  ) {}

  async preparar(): Promise<void> {
    const sede = await this.prisma.sede.create({
      data: { nombre: `Sede eventos integ ${this.sufijo}`, direccion: 'Calle 7 entre 50 y 51', horarios: 'Domingos 10 hs', activo: true },
      select: { id: true },
    });
    this.sedeId = sede.id;
  }

  async persona(clave: string, opciones: { rol?: string[]; estado?: 'activa' | 'pendiente_tutor' } = {}): Promise<string> {
    const persona = await this.prisma.persona.create({
      data: {
        email: `integ-ev-${clave}-${this.sufijo}@example.com`,
        nombre: clave,
        apellido: `Eventos${this.sufijo}`,
        genero: 'femenino',
        fechaNacimiento: new Date('1990-05-20'),
        telefono: '+5492211234567',
        direccion: 'Calle 1 y 50',
        sedeId: this.sedeId,
        estadoCivil: 'soltero_a',
        profesion: 'otro',
        congregaDesde: 2020,
        estado: opciones.estado ?? 'activa',
        consentimientoDatos: true,
        rol: opciones.rol ?? ['miembro_registrado'],
      },
      select: { id: true },
    });
    this.personas.push(persona.id);
    return persona.id;
  }

  async evento(datos: Partial<Prisma.EventoUncheckedCreateInput> = {}): Promise<{ id: string; slug: string }> {
    const n = Math.random().toString(36).slice(2, 8);
    return this.prisma.evento.create({
      data: {
        sedeId: this.sedeId,
        nombre: `Evento integ ${n}`,
        slug: `evento-integ-${this.sufijo}-${n}`,
        descripcion: 'Descripción del Evento.',
        inicio: EN_UN_MES(),
        requiereInscripcion: true,
        creadoPorId: 'integ',
        ...datos,
      },
      select: { id: true, slug: true },
    });
  }

  async inscripcion(
    eventoId: string,
    personaId: string,
    estado: 'confirmada' | 'pendiente' | 'lista_espera' | 'cancelada' | 'rechazada' = 'confirmada',
    enListaDesde?: Date,
  ): Promise<string> {
    const i = await this.prisma.inscripcionEvento.create({
      data: {
        eventoId,
        personaId,
        estado,
        enListaDesde: estado === 'lista_espera' ? (enListaDesde ?? new Date()) : null,
        ...(estado === 'cancelada' ? { canceladaEn: new Date(), motivoCancelacion: 'persona' as const } : {}),
      },
      select: { id: true },
    });
    return i.id;
  }

  async pago(inscripcionEventoId: string, estado: 'pendiente_verificacion' | 'verificado' = 'pendiente_verificacion'): Promise<string> {
    const p = await this.prisma.pago.create({
      data: { inscripcionEventoId, monto: '1000.00', medio: 'transferencia', fechaPago: new Date(), estado },
      select: { id: true },
    });
    return p.id;
  }

  async limpiar(): Promise<void> {
    const p = this.prisma;
    const eventos = (await p.evento.findMany({ where: { sedeId: this.sedeId }, select: { id: true } })).map((e) => e.id);
    const inscripcionWhere = { OR: [{ eventoId: { in: eventos } }, { personaId: { in: this.personas } }] };
    await p.entregaNotificacion.deleteMany({ where: { personaId: { in: this.personas } } });
    await p.pago.deleteMany({ where: { inscripcionEvento: inscripcionWhere } });
    await p.inscripcionEvento.deleteMany({ where: inscripcionWhere });
    await p.evento.deleteMany({ where: { id: { in: eventos } } });
    await p.persona.deleteMany({ where: { id: { in: this.personas } } });
    await p.sede.deleteMany({ where: { id: this.sedeId } });
  }
}
