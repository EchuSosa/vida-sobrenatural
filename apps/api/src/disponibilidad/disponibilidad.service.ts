import { Injectable } from '@nestjs/common';
import { hoyEnArgentina, type MiDisponibilidad } from '@vida-sobrenatural/shared-types';
import { PrismaService } from '../prisma/prisma.service.js';
import { AppException, type AppExceptionErrorField } from '../common/errors/app-exception.js';
import { aparicionEnElCruce, bloqueosVisibles, validarBloqueo, validarFranja, validarFranjaContraAgenda, validarMaximoPorGrupo } from './disponibilidad-puro.js';
import type { CrearFranjaDto } from './dto/crear-franja.dto.js';
import type { CrearBloqueoDto } from './dto/crear-bloqueo.dto.js';
import type { ActualizarDisponibilidadDto } from './dto/actualizar-disponibilidad.dto.js';
import { comoFechaCivil } from '../discipulado/consultas.js';

function desdeFechaCivil(fecha: string): Date {
  return new Date(`${fecha}T00:00:00.000Z`);
}

function rechazarSiHayErrores(errores: AppExceptionErrorField[]): void {
  if (errores.length > 0) {
    throw new AppException('VALIDACION', 400, 'Uno o más campos no son válidos.', errores);
  }
}

/**
 * specs/004, Historia 4 (T038, contracts/disponibilidad-api.md): la agenda, el
 * toggle, el máximo por Grupo y los períodos de no disponibilidad del propio
 * Discipulador. Todo se resuelve desde la sesión (D134): ningún método recibe
 * la Persona de afuera del controller. Cada escritura devuelve el estado
 * completo (`MiDisponibilidad`), para que la pantalla no tenga que volver a
 * pedirlo. Nada de acá toca discipulados en curso ni propuestas (FR-018), y
 * el sistema nunca cambia `disponibleDiscipulado` por su cuenta (FR-015).
 */
@Injectable()
export class DisponibilidadService {
  constructor(private readonly prisma: PrismaService) {}

  async obtener(personaId: string): Promise<MiDisponibilidad> {
    const hoy = hoyEnArgentina();
    const [persona, franjas, bloqueos] = await Promise.all([
      this.prisma.persona.findUniqueOrThrow({
        where: { id: personaId },
        select: { disponibleDiscipulado: true, maxPersonasPorGrupo: true },
      }),
      this.prisma.franjaAgenda.findMany({
        where: { personaId, eliminadaEn: null },
        select: { id: true, diaSemana: true, inicio: true, fin: true },
        orderBy: [{ diaSemana: 'asc' }, { inicio: 'asc' }, { fin: 'asc' }],
      }),
      this.prisma.bloqueoDisponibilidad.findMany({
        where: { personaId, eliminadoEn: null, hasta: { gte: desdeFechaCivil(hoy) } },
        select: { id: true, desde: true, hasta: true },
      }),
    ]);
    const bloqueosCiviles = bloqueos.map((b) => ({ id: b.id, desde: comoFechaCivil(b.desde), hasta: comoFechaCivil(b.hasta) }));
    return {
      disponible: persona.disponibleDiscipulado,
      maxPersonasPorGrupo: persona.maxPersonasPorGrupo,
      franjas,
      bloqueos: bloqueosVisibles(bloqueosCiviles, hoy),
      ...aparicionEnElCruce({
        cantidadFranjas: franjas.length,
        disponible: persona.disponibleDiscipulado,
        bloqueos: bloqueosCiviles,
        hoy,
      }),
    };
  }

  /** FR-031. Sin franjas cortas, repetidas ni superpuestas (FR-017a). No prende el toggle (FR-015). */
  async agregarFranja(personaId: string, dto: CrearFranjaDto): Promise<MiDisponibilidad> {
    rechazarSiHayErrores(validarFranja(dto));
    const cargadas = await this.prisma.franjaAgenda.findMany({
      where: { personaId, eliminadaEn: null },
      select: { diaSemana: true, inicio: true, fin: true },
    });
    rechazarSiHayErrores(validarFranjaContraAgenda(dto, cargadas));
    await this.prisma.franjaAgenda.create({
      data: { personaId, diaSemana: dto.diaSemana, inicio: dto.inicio, fin: dto.fin },
      select: { id: true },
    });
    return this.obtener(personaId);
  }

  /** Borrado lógico (Principio III). Borrar la última no apaga el toggle (FR-015). */
  async borrarFranja(personaId: string, franjaId: string): Promise<MiDisponibilidad> {
    const { count } = await this.prisma.franjaAgenda.updateMany({
      where: { id: franjaId, personaId, eliminadaEn: null },
      data: { eliminadaEn: new Date() },
    });
    if (count === 0) throw new AppException('NO_ENCONTRADO', 404, 'Esa franja no existe o ya estaba borrada.');
    return this.obtener(personaId);
  }

  /** Idempotente. Bajar el máximo no toca los Grupos que ya tiene (FR-045). */
  async actualizar(personaId: string, dto: ActualizarDisponibilidadDto): Promise<MiDisponibilidad> {
    if (dto.disponible === undefined && dto.maxPersonasPorGrupo === undefined) {
      throw new AppException('VALIDACION', 400, 'Mandá `disponible`, `maxPersonasPorGrupo` o los dos.');
    }
    if (dto.maxPersonasPorGrupo !== undefined) rechazarSiHayErrores(validarMaximoPorGrupo(dto.maxPersonasPorGrupo));
    await this.prisma.persona.update({
      where: { id: personaId },
      data: { disponibleDiscipulado: dto.disponible, maxPersonasPorGrupo: dto.maxPersonasPorGrupo },
      select: { id: true },
    });
    return this.obtener(personaId);
  }

  /** FR-016/FR-017. Superposiciones permitidas. */
  async agregarBloqueo(personaId: string, dto: CrearBloqueoDto): Promise<MiDisponibilidad> {
    rechazarSiHayErrores(validarBloqueo(dto, hoyEnArgentina()));
    await this.prisma.bloqueoDisponibilidad.create({
      data: { personaId, desde: desdeFechaCivil(dto.desde), hasta: desdeFechaCivil(dto.hasta) },
      select: { id: true },
    });
    return this.obtener(personaId);
  }

  /**
   * FR-040 (H-R12): cambiar las fechas de un período propio, con las mismas
   * reglas que al crearlo (un período que ya terminó no se guarda). Si queda
   * vigente, deja de aparecer en el cruce en el acto; si deja de serlo, vuelve.
   */
  async editarBloqueo(personaId: string, bloqueoId: string, dto: CrearBloqueoDto): Promise<MiDisponibilidad> {
    rechazarSiHayErrores(validarBloqueo(dto, hoyEnArgentina()));
    const { count } = await this.prisma.bloqueoDisponibilidad.updateMany({
      where: { id: bloqueoId, personaId, eliminadoEn: null },
      data: { desde: desdeFechaCivil(dto.desde), hasta: desdeFechaCivil(dto.hasta) },
    });
    if (count === 0) throw new AppException('NO_ENCONTRADO', 404, 'Ese período no existe o ya estaba borrado.');
    return this.obtener(personaId);
  }

  /** FR-040: borrado lógico. Si estaba vigente, vuelve a aparecer en el cruce en el acto. */
  async borrarBloqueo(personaId: string, bloqueoId: string): Promise<MiDisponibilidad> {
    const { count } = await this.prisma.bloqueoDisponibilidad.updateMany({
      where: { id: bloqueoId, personaId, eliminadoEn: null },
      data: { eliminadoEn: new Date() },
    });
    if (count === 0) throw new AppException('NO_ENCONTRADO', 404, 'Ese período no existe o ya estaba borrado.');
    return this.obtener(personaId);
  }
}
