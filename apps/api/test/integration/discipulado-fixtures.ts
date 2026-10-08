import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { SignJWT } from 'jose';
import type { Server } from 'node:http';
import type { Franja } from '@vida-sobrenatural/shared-types';
import { AppModule } from '../../src/app.module.js';
import { PrismaService } from '../../src/prisma/prisma.service.js';
import { configurarApp } from '../../src/configurar-app.js';

/**
 * specs/004, lote B: el escenario de los tests de integración del
 * discipulado, armado directo por Prisma (T037d: hasta que exista el
 * servicio de proponer del lote A, la Propuesta se crea en el setup). Cada
 * archivo arma el suyo con un sufijo propio y lo borra entero al terminar, en
 * el orden de las claves (mismo orden que scripts/limpiar-e2e.ts, H-67).
 */
export const MARTES_19_A_21: Franja = { diaSemana: 2, inicio: 19 * 60, fin: 21 * 60 };

export async function levantarApp(): Promise<{ app: INestApplication<Server>; prisma: PrismaService }> {
  const moduleFixture = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleFixture.createNestApplication<INestApplication<Server>>();
  configurarApp(app);
  await app.init();
  return { app, prisma: moduleFixture.get(PrismaService) };
}

export async function tokenDe(personaId: string, rol: string[]): Promise<string> {
  const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
  return new SignJWT({ email: `${personaId}@example.com`, personaId, estado: 'activa', rol })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(secret);
}

export class Escenario {
  private readonly personas: string[] = [];
  sedeId = '';
  cursoId = '';

  constructor(
    private readonly prisma: PrismaService,
    private readonly sufijo: string,
  ) {}

  async preparar(): Promise<void> {
    const sede = await this.prisma.sede.create({
      data: { nombre: `Sede discipulado integ ${this.sufijo}`, direccion: 'Dirección', horarios: 'Horario', activo: true },
    });
    this.sedeId = sede.id;
    const curso = await this.prisma.curso.upsert({
      where: { categoria_tipo: { categoria: 'vida_nueva', tipo: 'individual' } },
      update: {},
      create: { nombre: 'Vida Nueva', categoria: 'vida_nueva', tipo: 'individual', modalidad: 'seguimiento_por_encuentros' },
    });
    this.cursoId = curso.id;
  }

  async persona(
    clave: string,
    opciones: { rol?: string[]; genero?: 'femenino' | 'masculino'; fechaNacimiento?: Date; telefono?: string; direccion?: string } = {},
  ): Promise<string> {
    const persona = await this.prisma.persona.create({
      data: {
        email: `integ-disc-${clave}-${this.sufijo}@example.com`,
        nombre: clave,
        apellido: `Test${this.sufijo}`,
        genero: opciones.genero ?? 'femenino',
        fechaNacimiento: opciones.fechaNacimiento ?? new Date('1990-05-20'),
        telefono: opciones.telefono ?? '+5492211234567',
        direccion: opciones.direccion ?? 'Calle 1 y 50',
        sedeId: this.sedeId,
        estadoCivil: 'soltero_a',
        profesion: 'otro',
        congregaDesde: 2020,
        estado: 'activa',
        consentimientoDatos: true,
        rol: opciones.rol ?? ['miembro_registrado'],
      },
      select: { id: true },
    });
    this.personas.push(persona.id);
    return persona.id;
  }

  /** Un Discipulador que hoy aparece en el cruce (FR-006): rol, toggle prendido y agenda. */
  async discipulador(clave: string, opciones: { genero?: 'femenino' | 'masculino'; max?: number } = {}): Promise<string> {
    const id = await this.persona(clave, { rol: ['miembro_registrado', 'discipulador'], genero: opciones.genero });
    await this.prisma.persona.update({ where: { id }, data: { disponibleDiscipulado: true, maxPersonasPorGrupo: opciones.max ?? 1 } });
    await this.prisma.franjaAgenda.create({ data: { personaId: id, ...MARTES_19_A_21 } });
    return id;
  }

  /** Una Solicitud `propuesta` con su Propuesta `nueva` pendiente — lo que deja el `proponer` del lote A. */
  async propuestaNueva(personaId: string, discipuladorId: string, adminId: string, grupoDestinoId?: string) {
    const solicitud = await this.prisma.solicitudDiscipulado.create({
      data: { personaId, estado: 'propuesta', revisadoPorId: adminId, revisadaEn: new Date(), franjas: { create: [MARTES_19_A_21] } },
      select: { id: true },
    });
    const propuesta = await this.prisma.propuestaDiscipulado.create({
      data: { tipo: 'nueva', solicitudId: solicitud.id, discipuladorId, propuestaPorId: adminId, grupoDestinoId },
      select: { id: true },
    });
    return { solicitudId: solicitud.id, propuestaId: propuesta.id };
  }

  /** Un Grupo en curso con estas Personas y este Discipulador, como si ya hubieran aceptado. */
  async grupo(discipuladorId: string, personaIds: string[], adminId: string): Promise<{ grupoId: string; inscripciones: string[] }> {
    const grupo = await this.prisma.grupo.create({ data: { cursoId: this.cursoId, sedeId: this.sedeId }, select: { id: true } });
    const inscripciones: string[] = [];
    for (const personaId of personaIds) {
      const { solicitudId, propuestaId } = await this.propuestaNueva(personaId, discipuladorId, adminId);
      await this.prisma.propuestaDiscipulado.update({ where: { id: propuestaId }, data: { estado: 'aceptada', respondidaEn: new Date() } });
      await this.prisma.solicitudDiscipulado.update({ where: { id: solicitudId }, data: { estado: 'aprobada', grupoId: grupo.id } });
      const inscripcion = await this.prisma.inscripcion.create({ data: { personaId, grupoId: grupo.id, solicitudId }, select: { id: true } });
      inscripciones.push(inscripcion.id);
      if (inscripciones.length === 1) {
        await this.prisma.liderazgo.create({ data: { personaId: discipuladorId, grupoId: grupo.id, propuestaId } });
      }
    }
    return { grupoId: grupo.id, inscripciones };
  }

  async limpiar(): Promise<void> {
    const ids = this.personas;
    const p = this.prisma;
    const grupos = (await p.inscripcion.findMany({ where: { personaId: { in: ids } }, select: { grupoId: true } })).map((i) => i.grupoId);
    const solicitudes = (await p.solicitudDiscipulado.findMany({ where: { personaId: { in: ids } }, select: { id: true } })).map((s) => s.id);
    await p.asistencia.deleteMany({ where: { encuentro: { grupoId: { in: grupos } } } });
    await p.encuentro.deleteMany({ where: { grupoId: { in: grupos } } });
    await p.liderazgo.deleteMany({ where: { OR: [{ personaId: { in: ids } }, { grupoId: { in: grupos } }] } });
    await p.inscripcion.deleteMany({ where: { OR: [{ personaId: { in: ids } }, { grupoId: { in: grupos } }] } });
    await p.propuestaDiscipulado.deleteMany({ where: { OR: [{ discipuladorId: { in: ids } }, { solicitudId: { in: solicitudes } }, { grupoId: { in: grupos } }] } });
    await p.franjaSolicitud.deleteMany({ where: { solicitudId: { in: solicitudes } } });
    await p.solicitudDiscipulado.deleteMany({ where: { id: { in: solicitudes } } });
    await p.grupo.deleteMany({ where: { OR: [{ id: { in: grupos } }, { sedeId: this.sedeId }] } });
    await p.franjaAgenda.deleteMany({ where: { personaId: { in: ids } } });
    await p.bloqueoDisponibilidad.deleteMany({ where: { personaId: { in: ids } } });
    await p.relacionFamiliar.deleteMany({ where: { OR: [{ personaId: { in: ids } }, { familiarId: { in: ids } }] } });
    await p.cambioDeRol.deleteMany({ where: { personaId: { in: ids } } });
    await p.persona.deleteMany({ where: { id: { in: ids } } });
    if (this.sedeId) await p.sede.delete({ where: { id: this.sedeId } });
  }
}
