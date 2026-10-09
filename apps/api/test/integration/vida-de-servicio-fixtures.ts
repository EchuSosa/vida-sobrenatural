import { cronogramaPropuesto, hoyEnArgentina, sumarDias } from '@vida-sobrenatural/shared-types';
import type { PrismaService } from '../../src/prisma/prisma.service.js';
import { Escenario, MARTES_19_A_21, cursoDelCatalogo } from './discipulado-fixtures.js';
import { tomarCandadoCursos } from './candado-cursos.js';

/**
 * spec 008 — el escenario de los tests de integración de Vida de Servicio,
 * armado por Prisma sobre el `Escenario` de la 004 (Personas, Sede, Curso de
 * Vida Nueva). Lo propio: el Curso de Vida de Servicio, ediciones con su
 * cronograma y Líderes, Vida Nueva completada (individual o grupal),
 * Inscripciones aprobadas y material. `limpiar()` borra lo de la 008 y
 * después llama al de la 004.
 */
export class EscenarioVS {
  readonly esc: Escenario;
  cursoVsId = '';
  private cursoVnGrupalId = '';
  private soltarCandado: (() => Promise<void>) | null = null;

  constructor(
    private readonly prisma: PrismaService,
    readonly sufijo: string,
  ) {
    this.esc = new Escenario(prisma, sufijo);
  }

  get sedeId(): string {
    return this.esc.sedeId;
  }

  async preparar(): Promise<void> {
    // Comparte "Vida Nueva grupal" con el test de Cursos (013): ver candado-cursos.ts.
    this.soltarCandado = await tomarCandadoCursos('compartido');
    await this.esc.preparar();
    const vs = await cursoDelCatalogo(this.prisma, { nombre: 'Vida de Servicio', categoria: 'vida_de_servicio', tipo: 'grupal', modalidad: 'liberacion_programada', prerequisitoCategoria: 'vida_nueva' });
    this.cursoVsId = vs.id;
    const vnGrupal = await cursoDelCatalogo(this.prisma, { nombre: 'Vida Nueva grupal', categoria: 'vida_nueva', tipo: 'grupal', modalidad: 'seguimiento_por_encuentros' });
    this.cursoVnGrupalId = vnGrupal.id;
  }

  persona(clave: string, opciones: Parameters<Escenario['persona']>[1] = {}): Promise<string> {
    return this.esc.persona(clave, opciones);
  }

  /** Una Persona con `lider_curso`. */
  lider(clave: string): Promise<string> {
    return this.esc.persona(clave, { rol: ['miembro_registrado', 'lider_curso'] });
  }

  /** Una Persona con Vida Nueva completada por el sistema (FR-008), individual o grupal. */
  async apta(clave: string, tipo: 'individual' | 'grupal' = 'individual', opciones: Parameters<Escenario['persona']>[1] = {}): Promise<string> {
    const id = await this.esc.persona(clave, opciones);
    await this.completarVidaNueva(id, tipo);
    return id;
  }

  async completarVidaNueva(personaId: string, tipo: 'individual' | 'grupal' = 'individual'): Promise<string> {
    const grupo = await this.prisma.grupo.create({
      data: { cursoId: tipo === 'individual' ? this.esc.cursoId : this.cursoVnGrupalId, sedeId: this.sedeId, estado: 'finalizado', motivoCierre: 'completado', cerradoEn: new Date() },
      select: { id: true },
    });
    const solicitud = await this.prisma.solicitudDiscipulado.create({
      data: { personaId, estado: 'aprobada', grupoId: grupo.id, franjas: { create: [MARTES_19_A_21] } },
      select: { id: true },
    });
    const inscripcion = await this.prisma.inscripcion.create({
      data: { personaId, grupoId: grupo.id, solicitudId: solicitud.id, estado: 'completada', cerradaEn: new Date() },
      select: { id: true },
    });
    return inscripcion.id;
  }

  /** Una edición en curso con su cronograma (por defecto 8 semanas desde `inicio`) y Líderes vigentes. */
  async edicion(opciones: { nombre?: string; inicio?: string; fechas?: string[]; lideres?: string[]; abierta?: boolean; semanas?: number } = {}): Promise<string> {
    const inicio = opciones.inicio ?? sumarDias(hoyEnArgentina(), -14);
    const fechas = opciones.fechas ?? cronogramaPropuesto(inicio, opciones.semanas ?? 8);
    const grupo = await this.prisma.grupo.create({
      data: {
        cursoId: this.cursoVsId,
        sedeId: this.sedeId,
        nombre: opciones.nombre ?? `Edición ${this.sufijo}`,
        fechaInicio: new Date(`${inicio}T00:00:00Z`),
        inscripcionAbierta: opciones.abierta ?? true,
        items: { create: fechas.map((f, i) => ({ numeroSemana: i + 1, fechaLiberacion: new Date(`${f}T00:00:00Z`) })) },
      },
      select: { id: true },
    });
    for (const personaId of opciones.lideres ?? []) {
      await this.prisma.liderazgo.create({ data: { personaId, grupoId: grupo.id } });
    }
    return grupo.id;
  }

  /** Inscribe a la Persona como lo deja una aprobación (Solicitud aprobada + Inscripción `activa`). */
  async inscribir(personaId: string, grupoId: string, estado: 'activa' | 'completada' | 'dada_de_baja' | 'abandono' = 'activa', cerradaEn?: Date): Promise<string> {
    const solicitud = await this.prisma.solicitudVidaServicio.create({ data: { personaId, grupoId, estado: 'aprobada', revisadaEn: new Date() }, select: { id: true } });
    const inscripcion = await this.prisma.inscripcion.create({
      data: { personaId, grupoId, solicitudVidaServicioId: solicitud.id, estado, cerradaEn: estado === 'activa' ? null : (cerradaEn ?? new Date()) },
      select: { id: true },
    });
    return inscripcion.id;
  }

  /** Material de una semana, cargado por Prisma (texto solo). */
  async material(grupoId: string, numero: number, cargadoPorId: string, titulo = `Semana ${numero}`): Promise<string> {
    const item = await this.prisma.itemCronograma.findFirstOrThrow({ where: { grupoId, numeroSemana: numero, eliminadoEn: null }, select: { id: true } });
    const c = await this.prisma.contenido.create({ data: { grupoId, itemCronogramaId: item.id, titulo, texto: 'Leer el capítulo', cargadoPorId, liberacionAvisadaEn: new Date() }, select: { id: true } });
    return c.id;
  }

  async limpiar(): Promise<void> {
    const p = this.prisma;
    const personas = (await p.persona.findMany({ where: { apellido: `Test${this.sufijo}` }, select: { id: true } })).map((x) => x.id);
    const grupos = (await p.grupo.findMany({ where: { OR: [{ sedeId: this.sedeId }, { inscripciones: { some: { personaId: { in: personas } } } }] }, select: { id: true } })).map((g) => g.id);
    const contenidos = (await p.contenido.findMany({ where: { grupoId: { in: grupos } }, select: { id: true } })).map((c) => c.id);
    await p.enlaceContenido.deleteMany({ where: { contenidoId: { in: contenidos } } });
    await p.archivoContenido.deleteMany({ where: { contenidoId: { in: contenidos } } });
    await p.contenido.deleteMany({ where: { id: { in: contenidos } } });
    await p.itemCronograma.deleteMany({ where: { grupoId: { in: grupos } } });
    await p.asistencia.deleteMany({ where: { encuentro: { grupoId: { in: grupos } } } });
    await p.encuentro.deleteMany({ where: { grupoId: { in: grupos } } });
    await p.inscripcion.deleteMany({ where: { OR: [{ grupoId: { in: grupos } }, { personaId: { in: personas } }] } });
    await p.solicitudVidaServicio.deleteMany({ where: { OR: [{ personaId: { in: personas } }, { grupoId: { in: grupos } }] } });
    await p.liderazgo.deleteMany({ where: { grupoId: { in: grupos } } });
    await p.completitudManual.deleteMany({ where: { personaId: { in: personas } } });
    await p.declaracionHistorial.deleteMany({ where: { personaId: { in: personas } } });
    const notificaciones = (await p.entregaNotificacion.findMany({ where: { personaId: { in: personas } }, select: { notificacionId: true } })).map((e) => e.notificacionId);
    await p.entregaNotificacion.deleteMany({ where: { OR: [{ personaId: { in: personas } }, { notificacionId: { in: notificaciones } }] } });
    await p.notificacion.deleteMany({ where: { OR: [{ id: { in: notificaciones } }, { alcanceId: { in: grupos } }] } });
    await this.esc.limpiar();
    await this.soltarCandado?.();
    this.soltarCandado = null;
  }
}
