import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  EstadoPersona,
  TemaPreferido,
  OrigenConsentimiento,
  OrigenAlta,
} from '../generated/prisma/enums.js';
import { calcularEdad } from './calcular-edad.js';
import { AppException } from '../common/errors/app-exception.js';
import type { RegistroPersonaDto } from './dto/registro-persona.dto.js';
import type { ActivarPersonaDto } from './dto/activar-persona.dto.js';

const EDAD_MINIMA = 18;

const PENDIENTE_TUTOR_SELECT = {
  id: true,
  nombre: true,
  apellido: true,
  telefono: true,
  fechaNacimiento: true,
  sedeId: true,
} as const;

@Injectable()
export class PersonaService {
  constructor(private readonly prisma: PrismaService) {}

  /** GET /personas/by-email — uso interno, ver contracts/auth-integration.md. */
  async findByEmail(email: string) {
    const persona = await this.prisma.persona.findUnique({
      where: { email },
      // temaPreferido: para que NextAuth pueda hidratar session.user.temaPreferido
      // sin flash (specs/002-base-transversal, research.md Decisión 3).
      select: { id: true, estado: true, activo: true, rol: true, temaPreferido: true },
    });
    if (!persona) {
      throw new AppException('NO_ENCONTRADO', 404, 'No existe una Persona con ese email.');
    }
    return persona;
  }

  /** GET /personas/me — Historia 5 (specs/002-base-transversal). */
  async obtenerPerfilPropio(personaId: string | null) {
    if (!personaId) {
      throw new AppException('NO_ENCONTRADO', 404, 'Esta sesión todavía no tiene una Persona asociada.');
    }
    const persona = await this.prisma.persona.findUnique({
      where: { id: personaId },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        email: true,
        fotoUrl: true,
        sedeId: true,
        estado: true,
        idiomaPreferido: true,
        temaPreferido: true,
      },
    });
    if (!persona) {
      throw new AppException('NO_ENCONTRADO', 404, 'Esta sesión todavía no tiene una Persona asociada.');
    }
    return persona;
  }

  /** PATCH /personas/me/preferencias — Historia 5, FR-027/FR-028. */
  async actualizarPreferenciasPropias(personaId: string | null, temaPreferido: TemaPreferido) {
    if (!personaId) {
      throw new AppException('NO_ENCONTRADO', 404, 'Esta sesión todavía no tiene una Persona asociada.');
    }
    return this.prisma.persona.update({
      where: { id: personaId },
      data: { temaPreferido },
      select: { id: true, temaPreferido: true },
    });
  }

  /** POST /personas — FR-005 a FR-009, FR-013 (Historia 2 y 2b). */
  async create(dto: RegistroPersonaDto, emailDeSesion: string) {
    const sede = await this.prisma.sede.findFirst({
      where: { id: dto.sedeId, activo: true },
    });
    if (!sede) {
      throw new AppException('SEDE_INVALIDA', 400, 'La Sede indicada no existe o no está activa.');
    }

    const fechaNacimiento = new Date(dto.fechaNacimiento);
    const esMayorDeEdad = calcularEdad(fechaNacimiento) >= EDAD_MINIMA;

    if (esMayorDeEdad && !dto.consentimientoDatos) {
      // FR-013: el consentimiento del propio adulto es obligatorio en el formulario.
      throw new AppException(
        'CONSENTIMIENTO_REQUERIDO',
        400,
        'Se requiere el consentimiento de almacenamiento de datos para completar el registro.',
      );
    }

    try {
      return await this.prisma.persona.create({
        data: {
          email: emailDeSesion,
          nombre: dto.nombre,
          apellido: dto.apellido,
          genero: dto.genero,
          fechaNacimiento,
          telefono: dto.telefono,
          direccion: dto.direccion,
          sedeId: dto.sedeId,
          estadoCivil: dto.estadoCivil,
          profesion: dto.profesion,
          // Solo tiene sentido cuando profesion = otro — el DTO ya lo exige
          // en ese caso y lo deja opcional en cualquier otro (ver dto).
          profesionDetalle: dto.profesionDetalle,
          tiempoCongregacion: dto.tiempoCongregacion,
          fotoUrl: dto.fotoUrl,
          estado: esMayorDeEdad ? EstadoPersona.activa : EstadoPersona.pendiente_tutor,
          // El menor no autoconsiente (FR-013) — su consentimiento llega recién
          // al activar, vía el tutor (ver `activar` más abajo).
          consentimientoDatos: esMayorDeEdad ? dto.consentimientoDatos : false,
          // Actualización 2026-09-17 (FR-013): fecha/origen solo cuando el
          // consentimiento se da acá mismo (mayor de edad, origen 'app').
          consentimientoDatosFecha: esMayorDeEdad ? new Date() : null,
          consentimientoDatosOrigen: esMayorDeEdad ? OrigenConsentimiento.app : null,
          // Actualización 2026-09-17 (FR-015, D97): esta fase solo produce
          // autorregistro — el alta por Admin es una feature propia.
          origenAlta: OrigenAlta.autorregistro,
          altaPor: null,
          rol: esMayorDeEdad ? ['miembro_registrado'] : [],
        },
        select: { id: true, estado: true },
      });
    } catch (error) {
      // FR-009: además del chequeo previo (evitado aquí a propósito para no
      // duplicar una consulta), el constraint único de `email` es la fuente de
      // verdad ante un registro simultáneo con el mismo email (condición de
      // carrera — ver spec.md, Edge Cases).
      if (isUniqueConstraintViolation(error, 'email')) {
        throw new AppException('EMAIL_DUPLICADO', 409, 'Ya existe una Persona registrada con este email.');
      }
      throw error;
    }
  }

  /** GET /personas/pendientes-tutor — Historia 2b, Acceptance Scenario 3. */
  findPendientesTutor() {
    return this.prisma.persona.findMany({
      where: { estado: EstadoPersona.pendiente_tutor, activo: true },
      select: PENDIENTE_TUTOR_SELECT,
      orderBy: { createdAt: 'asc' },
    });
  }

  /** PATCH /personas/:id/activar — FR-008, Flujo 7 camino A únicamente. */
  async activar(id: string, dto: ActivarPersonaDto) {
    const persona = await this.buscarPendienteTutorActivoOFallar(id);

    return this.prisma.persona.update({
      where: { id: persona.id },
      data: {
        estado: EstadoPersona.activa,
        tutorNombre: dto.tutorNombre,
        tutorTelefono: dto.tutorTelefono,
        // El consentimiento definitivo lo da el tutor en este paso, no el
        // menor en el formulario (FR-013; ver data-model.md).
        consentimientoDatos: true,
        // Actualización 2026-09-17 (FR-013): origen 'presencial' — el
        // consentimiento se toma fuera del sistema, durante el contacto
        // manual del Admin/Discipulador con el tutor.
        consentimientoDatosFecha: new Date(),
        consentimientoDatosOrigen: OrigenConsentimiento.presencial,
        rol: ['miembro_registrado'],
      },
      select: { id: true, estado: true },
    });
  }

  /** PATCH /personas/:id/marcar-inactiva — FR-014. */
  async marcarInactiva(id: string) {
    const persona = await this.buscarPendienteTutorActivoOFallar(id);

    return this.prisma.persona.update({
      where: { id: persona.id },
      data: { activo: false },
      select: { id: true, activo: true },
    });
  }

  private async buscarPendienteTutorActivoOFallar(id: string) {
    const persona = await this.prisma.persona.findUnique({ where: { id } });
    if (!persona || persona.estado !== EstadoPersona.pendiente_tutor || !persona.activo) {
      throw new AppException('PERSONA_NO_PENDIENTE_TUTOR', 409, 'La Persona no está en estado pendiente_tutor.');
    }
    return persona;
  }
}

/**
 * Prisma 7 + driver adapters ya no exponen `meta.target` para P2002 — el
 * detalle real viene en `meta.driverAdapterError.cause.constraint.index`
 * (el nombre del índice/constraint de Postgres, ej. "personas_email_key").
 */
function isUniqueConstraintViolation(error: unknown, field: string): boolean {
  if (typeof error !== 'object' || error === null || (error as { code?: unknown }).code !== 'P2002') {
    return false;
  }
  const meta = (error as { meta?: { driverAdapterError?: { cause?: { constraint?: { index?: string } } } } }).meta;
  const constraintIndex = meta?.driverAdapterError?.cause?.constraint?.index ?? '';
  return constraintIndex.includes(field);
}
