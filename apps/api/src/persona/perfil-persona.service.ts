import { Injectable } from '@nestjs/common';
import {
  PERFIL_ITEMS_POR_SECCION,
  ROLES_DE_CARGO,
  esMenorDeEdad,
  hoyEnArgentina,
  puedeQuitarRol,
  relacionDesde,
  type ResultadoQuitarRol,
  type RolDeCargo,
  type GrupoEnPerfil,
  type GruposDePersona,
  type PerfilPersona,
  type PersonaBreve,
  type RelacionFamiliarVista,
} from '@vida-sobrenatural/shared-types';
import { PrismaService } from '../prisma/prisma.service.js';
import { AppException } from '../common/errors/app-exception.js';
import { calcularEdad } from './calcular-edad.js';
import { discipuladosActivosDeVarias, gruposServicioActivosDeVarias, propuestasPendientesDeVarias } from '../discipulado/discipulados-activos.js';

const PERSONA_BREVE_SELECT = { id: true, nombre: true, apellido: true, fotoUrl: true } as const;
const CURSO_SELECT = { nombre: true, categoria: true, tipo: true } as const;

/**
 * spec 013, Historia 2 (T030, T031 — contracts/perfil-persona-api.md): una
 * Persona entera para el perfil del backoffice. `select` explícito: nunca
 * notas de Encuentros, motivos de declinación ni campos técnicos
 * (`adminSembrado`, preferencias) — FR-015. Archivo nuevo (mapa §3): no
 * reescribe nada de `persona.service.ts`.
 */
@Injectable()
export class PerfilPersonaService {
  constructor(private readonly prisma: PrismaService) {}

  /** `autorId`: quien mira, para `quitar` (null = sesión sin Persona, H-140). */
  async perfil(id: string, autorId: string | null, ahora: Date = new Date()): Promise<PerfilPersona> {
    const p = await this.prisma.persona.findUnique({
      where: { id },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        fotoUrl: true,
        fechaNacimiento: true,
        genero: true,
        estadoCivil: true,
        profesion: true,
        profesionDetalle: true,
        telefono: true,
        direccion: true,
        email: true,
        sede: { select: { id: true, nombre: true, activo: true } },
        congregaDesde: true,
        estado: true,
        activo: true,
        origenAlta: true,
        altaPor: true,
        consentimientoDatosFecha: true,
        consentimientoDatosOrigen: true,
        tutorNombre: true,
        tutorApellido: true,
        tutorTelefono: true,
        rol: true,
        adminSembrado: true,
        createdAt: true,
        relacionesComoSujeto: { select: { tipoRelacion: true, familiar: { select: PERSONA_BREVE_SELECT } }, orderBy: { createdAt: 'asc' } },
        relacionesComoFamiliar: { select: { tipoRelacion: true, persona: { select: PERSONA_BREVE_SELECT } }, orderBy: { createdAt: 'asc' } },
      },
    });
    if (!p) throw new AppException('NO_ENCONTRADO', 404, 'No existe una Persona con ese id.');

    const relaciones: RelacionFamiliarVista[] = [
      ...p.relacionesComoSujeto.map((r) => ({ familiar: r.familiar, relacion: relacionDesde(r.tipoRelacion, 'sujeto') })),
      ...p.relacionesComoFamiliar.map((r) => ({ familiar: r.persona, relacion: relacionDesde(r.tipoRelacion, 'familiar') })),
    ];
    const fechaNacimiento = p.fechaNacimiento.toISOString().slice(0, 10);
    const [altaPor, discipulados, propuestas, gruposServicio] = await Promise.all([
      p.altaPor ? this.prisma.persona.findUnique({ where: { id: p.altaPor }, select: PERSONA_BREVE_SELECT }) : null,
      discipuladosActivosDeVarias(this.prisma, [p.id]),
      propuestasPendientesDeVarias(this.prisma, [p.id]),
      gruposServicioActivosDeVarias(this.prisma, [p.id]),
    ]);
    // `adminSembrado` solo entra a `puedeQuitarRol`; nunca sale en la respuesta (FR-015).
    const paraQuitar = {
      id: p.id,
      adminSembrado: p.adminSembrado,
      discipuladosActivos: discipulados.get(p.id) ?? [],
      propuestasPendientes: propuestas.get(p.id) ?? [],
      gruposServicioActivos: gruposServicio.get(p.id) ?? [],
    };

    return {
      id: p.id,
      nombre: p.nombre,
      apellido: p.apellido,
      fotoUrl: p.fotoUrl,
      fechaNacimiento,
      edad: calcularEdad(p.fechaNacimiento, ahora),
      genero: p.genero,
      estadoCivil: p.estadoCivil,
      profesion: p.profesion,
      profesionDetalle: p.profesionDetalle,
      telefono: p.telefono,
      direccion: p.direccion,
      email: p.email,
      sede: { id: p.sede.id, nombre: p.sede.nombre, activa: p.sede.activo },
      congregaDesde: p.congregaDesde,
      estado: p.estado,
      activo: p.activo,
      usaLaApp: p.email !== null,
      origenAlta: p.origenAlta,
      altaPor,
      consentimiento:
        p.consentimientoDatosFecha && p.consentimientoDatosOrigen
          ? { fecha: p.consentimientoDatosFecha.toISOString(), origen: p.consentimientoDatosOrigen }
          : null,
      tutor: esMenorDeEdad(fechaNacimiento, hoyEnArgentina(ahora)) ? tutorDe(p, relaciones) : null,
      roles: {
        deCargo: ROLES_DE_CARGO.filter((r) => p.rol.includes(r)),
        delProceso: p.rol.filter((r) => !(ROLES_DE_CARGO as readonly string[]).includes(r)),
      },
      quitar: Object.fromEntries(ROLES_DE_CARGO.map((rol) => [rol, puedeQuitarRol(rol, paraQuitar, autorId)])) as Record<RolDeCargo, ResultadoQuitarRol>,
      relaciones,
      createdAt: p.createdAt.toISOString(),
    };
  }

  /** Grupos que cursó (Inscripciones) y que tuvo a cargo (Liderazgos), los más recientes primero (FR-013). */
  async grupos(personaId: string, take = PERFIL_ITEMS_POR_SECCION): Promise<GruposDePersona> {
    if (!(await this.prisma.persona.findUnique({ where: { id: personaId }, select: { id: true } }))) {
      throw new AppException('NO_ENCONTRADO', 404, 'No existe una Persona con ese id.');
    }
    const grupoSelect = { id: true, estado: true, curso: { select: CURSO_SELECT } } as const;
    const [inscripciones, totalCursados, liderazgos, totalACargo] = await Promise.all([
      this.prisma.inscripcion.findMany({
        where: { personaId },
        select: { estado: true, createdAt: true, cerradaEn: true, grupo: { select: grupoSelect } },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        take,
      }),
      this.prisma.inscripcion.count({ where: { personaId } }),
      this.prisma.liderazgo.findMany({
        where: { personaId },
        select: { desde: true, hasta: true, grupo: { select: grupoSelect } },
        orderBy: [{ desde: 'desc' }, { id: 'asc' }],
        take,
      }),
      this.prisma.liderazgo.count({ where: { personaId } }),
    ]);
    const cursados: GrupoEnPerfil[] = inscripciones.map((i) => ({
      grupoId: i.grupo.id,
      curso: i.grupo.curso,
      estadoGrupo: i.grupo.estado,
      estadoInscripcion: i.estado,
      desde: i.createdAt.toISOString(),
      hasta: i.cerradaEn?.toISOString() ?? null,
    }));
    const aCargo: GrupoEnPerfil[] = liderazgos.map((l) => ({
      grupoId: l.grupo.id,
      curso: l.grupo.curso,
      estadoGrupo: l.grupo.estado,
      desde: l.desde.toISOString(),
      hasta: l.hasta?.toISOString() ?? null,
    }));
    return { cursados, aCargo, totalCursados, totalACargo };
  }
}

/** El tutor de un menor: el vinculado como Persona (D112) o el cargado como texto al activarlo (Flujo 7). */
function tutorDe(
  p: { tutorNombre: string | null; tutorApellido: string | null; tutorTelefono: string | null },
  relaciones: RelacionFamiliarVista[],
): PerfilPersona['tutor'] {
  const vinculado: PersonaBreve | undefined = relaciones.find((r) => r.relacion === 'tutor_de')?.familiar;
  if (vinculado) return { nombre: vinculado.nombre, apellido: vinculado.apellido, telefono: null, persona: vinculado };
  if (p.tutorNombre) return { nombre: p.tutorNombre, apellido: p.tutorApellido ?? '', telefono: p.tutorTelefono, persona: null };
  return null;
}
