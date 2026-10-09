import { Inject, Injectable } from '@nestjs/common';
import {
  consultasDeGeocodificacion,
  esMenorDeEdad,
  hoyEnArgentina,
  ordenarDias,
  validarDatosGrupo,
  type DatosGrupoExtension,
  type GrupoExtensionDetalle,
  type GrupoExtensionResumen,
  type ResultadoGuardarGrupo,
} from '@vida-sobrenatural/shared-types';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AppException } from '../common/errors/app-exception.js';
import { GEOCODIFICADOR, ubicarPrimera, type Geocodificador } from './geocodificador.js';
import { otorgarLiderExtension, quitarLiderExtensionSiNoLidera } from './rol-lider.js';
import {
  INCLUDE_GRUPO,
  contactoDe,
  contarIntegrantes,
  contarPendientes,
  diasDe,
  direccionDe,
  generoDe,
  grupoNoEncontrado,
  pendientesEIntegrantes,
} from './consultas.js';

export interface PersonaElegibleGex {
  id: string;
  nombre: string;
  apellido: string;
  email: string | null;
  genero: 'masculino' | 'femenino';
  menor: boolean;
}

/**
 * spec 014, D220–D222, D225: los Grupos de Extensión desde el backoffice.
 * La dirección se ubica ANTES de abrir la transacción (es una llamada de red);
 * si no se ubica, el Grupo se guarda igual, sin coordenadas (D222).
 */
@Injectable()
export class GruposExtensionService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(GEOCODIFICADOR) private readonly geocodificador: Geocodificador,
  ) {}

  async listar(soloActivos: boolean): Promise<GrupoExtensionResumen[]> {
    const grupos = await this.prisma.grupoExtension.findMany({
      where: soloActivos ? { activo: true } : {},
      include: INCLUDE_GRUPO,
      orderBy: [{ activo: 'desc' }, { nombre: 'asc' }],
    });
    const ids = grupos.map((g) => g.id);
    const [integrantes, pendientes] = await Promise.all([contarIntegrantes(this.prisma, ids), contarPendientes(this.prisma, ids)]);
    return grupos.map((g) => ({
      id: g.id,
      nombre: g.nombre,
      lideres: g.lideres.map((l) => `${l.persona.nombre} ${l.persona.apellido}`),
      genero: generoDe(g),
      dias: diasDe(g),
      horaInicio: g.horaInicio,
      zona: g.zona,
      enLaIglesia: g.enLaIglesia,
      cupo: g.cupo,
      integrantes: integrantes.get(g.id) ?? 0,
      pendientes: pendientes.get(g.id) ?? 0,
      ubicado: g.latitud !== null,
      activo: g.activo,
    }));
  }

  async detalle(id: string): Promise<GrupoExtensionDetalle> {
    const g = await this.prisma.grupoExtension.findUnique({ where: { id }, include: INCLUDE_GRUPO });
    if (!g) throw grupoNoEncontrado();
    return {
      id: g.id,
      nombre: g.nombre,
      dias: diasDe(g),
      horaInicio: g.horaInicio,
      cupo: g.cupo,
      edadMinima: g.edadMinima,
      edadMaxima: g.edadMaxima,
      enLaIglesia: g.enLaIglesia,
      sedeId: g.sedeId,
      sede: g.sede?.nombre ?? null,
      calle: g.calle,
      numero: g.numero,
      entreCalle1: g.entreCalle1,
      entreCalle2: g.entreCalle2,
      zona: g.zona,
      direccion: direccionDe(g),
      ubicado: g.latitud !== null,
      activo: g.activo,
      genero: generoDe(g),
      lideres: g.lideres.map((l) => contactoDe(l.persona)),
      ...(await pendientesEIntegrantes(this.prisma, g.id)),
    };
  }

  async crear(datos: DatosGrupoExtension, adminId: string): Promise<ResultadoGuardarGrupo> {
    const limpios = await this.validar(datos);
    const coordenadas = await this.ubicar(limpios);
    const id = await this.prisma.$transaction(async (tx) => {
      const grupo = await tx.grupoExtension.create({
        data: { ...this.columnas(limpios), ...coordenadas, creadoPorId: adminId },
        select: { id: true },
      });
      for (const personaId of limpios.lideres) {
        await tx.liderGrupoExtension.create({ data: { grupoId: grupo.id, personaId } });
        await otorgarLiderExtension(tx, personaId, adminId);
      }
      return grupo.id;
    });
    return { id, ubicado: coordenadas.latitud !== null };
  }

  async editar(id: string, datos: DatosGrupoExtension, adminId: string): Promise<ResultadoGuardarGrupo> {
    const actual = await this.prisma.grupoExtension.findUnique({ where: { id } });
    if (!actual) throw grupoNoEncontrado();
    const limpios = await this.validar(datos);
    const mismoLugar =
      actual.enLaIglesia === limpios.enLaIglesia &&
      actual.sedeId === limpios.sedeId &&
      actual.calle === limpios.calle &&
      actual.numero === limpios.numero &&
      actual.entreCalle1 === limpios.entreCalle1 &&
      actual.entreCalle2 === limpios.entreCalle2;
    // Si el lugar no cambió y ya estaba ubicado, no se vuelve a consultar el servicio.
    const coordenadas = mismoLugar && actual.latitud !== null ? { latitud: actual.latitud, longitud: actual.longitud } : await this.ubicar(limpios);
    await this.prisma.$transaction(async (tx) => {
      await tx.grupoExtension.update({ where: { id }, data: { ...this.columnas(limpios), ...coordenadas } });
      const vigentes = await tx.liderGrupoExtension.findMany({ where: { grupoId: id, hasta: null }, select: { id: true, personaId: true } });
      const salen = vigentes.filter((v) => !limpios.lideres.includes(v.personaId));
      const entran = limpios.lideres.filter((p) => !vigentes.some((v) => v.personaId === p));
      for (const s of salen) await tx.liderGrupoExtension.update({ where: { id: s.id }, data: { hasta: new Date() } });
      for (const personaId of entran) await tx.liderGrupoExtension.create({ data: { grupoId: id, personaId } });
      if (actual.activo) for (const personaId of entran) await otorgarLiderExtension(tx, personaId, adminId);
      for (const s of salen) await quitarLiderExtensionSiNoLidera(tx, s.personaId, adminId);
    });
    return { id, ubicado: coordenadas.latitud !== null };
  }

  /** FR-015: no se inactiva con integrantes o pedidos (nada se cierra solo sin que la persona se entere). */
  async inactivar(id: string, adminId: string): Promise<{ id: string }> {
    await this.prisma.$transaction(async (tx) => {
      const filas = await tx.$queryRaw<{ id: string }[]>`SELECT "id" FROM "grupos_extension" WHERE "id" = ${id} FOR UPDATE`;
      if (filas.length === 0) throw grupoNoEncontrado();
      const abiertas = await tx.solicitudGrupoExtension.count({ where: { grupoId: id, estado: { in: ['pendiente', 'aceptada'] } } });
      if (abiertas > 0) {
        throw new AppException('GRUPO_EXTENSION_CON_INTEGRANTES', 409, 'El grupo tiene integrantes o pedidos esperando respuesta.');
      }
      await tx.grupoExtension.update({ where: { id }, data: { activo: false } });
      const lideres = await tx.liderGrupoExtension.findMany({ where: { grupoId: id, hasta: null }, select: { personaId: true } });
      for (const l of lideres) await quitarLiderExtensionSiNoLidera(tx, l.personaId, adminId);
    });
    return { id };
  }

  async reactivar(id: string, adminId: string): Promise<{ id: string }> {
    await this.prisma.$transaction(async (tx) => {
      const grupo = await tx.grupoExtension.findUnique({ where: { id }, select: { id: true } });
      if (!grupo) throw grupoNoEncontrado();
      await tx.grupoExtension.update({ where: { id }, data: { activo: true } });
      const lideres = await tx.liderGrupoExtension.findMany({ where: { grupoId: id, hasta: null }, select: { personaId: true } });
      for (const l of lideres) await otorgarLiderExtension(tx, l.personaId, adminId);
    });
    return { id };
  }

  /** Para elegir líderes o sumar integrantes: Personas activas por nombre, apellido o email. */
  async personasElegibles(q: string): Promise<PersonaElegibleGex[]> {
    const texto = q.trim();
    if (texto.length < 2) return [];
    const palabras = texto.split(/\s+/).slice(0, 4);
    const personas = await this.prisma.persona.findMany({
      where: {
        activo: true,
        estado: 'activa',
        AND: palabras.map((p) => ({
          OR: [
            { nombre: { contains: p, mode: 'insensitive' as const } },
            { apellido: { contains: p, mode: 'insensitive' as const } },
            { email: { contains: p, mode: 'insensitive' as const } },
          ],
        })),
      },
      select: { id: true, nombre: true, apellido: true, email: true, genero: true, fechaNacimiento: true },
      orderBy: [{ apellido: 'asc' }, { nombre: 'asc' }],
      take: 10,
    });
    const hoy = hoyEnArgentina();
    return personas.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      apellido: p.apellido,
      email: p.email,
      genero: p.genero,
      menor: esMenorDeEdad(p.fechaNacimiento.toISOString(), hoy),
    }));
  }

  // --- Internos ---

  /** D220 + D133: las reglas del formulario (shared-types) y las que miran la base, todas por campo (H-50). */
  private async validar(d: DatosGrupoExtension): Promise<DatosGrupoExtension> {
    // El DTO solo declara qué campos existen: los tipos se revisan acá, y un tipo
    // equivocado cae en el mismo error de campo que un valor inválido.
    const texto = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);
    const lista = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
    const numero = (v: unknown) => (v === null || v === undefined || v === '' ? null : typeof v === 'number' ? v : Number.NaN);
    const limpios: DatosGrupoExtension = {
      nombre: texto(d.nombre) ?? '',
      lideres: [...new Set(lista(d.lideres))],
      dias: ordenarDias(lista(d.dias) as DatosGrupoExtension['dias']),
      horaInicio: texto(d.horaInicio) ?? '',
      cupo: numero(d.cupo),
      edadMinima: numero(d.edadMinima),
      edadMaxima: numero(d.edadMaxima),
      enLaIglesia: !!d.enLaIglesia,
      sedeId: d.enLaIglesia ? texto(d.sedeId) : null,
      calle: d.enLaIglesia ? null : texto(d.calle),
      numero: d.enLaIglesia ? null : texto(d.numero),
      entreCalle1: d.enLaIglesia ? null : texto(d.entreCalle1),
      entreCalle2: d.enLaIglesia ? null : texto(d.entreCalle2),
      zona: texto(d.zona),
    };
    // Los días que no son de la semana se descartan arriba (`ordenarDias`): si mandaron alguno, se avisa.
    const errores: Array<{ campo: string; code: string }> = validarDatosGrupo(limpios);
    if (new Set(lista(d.dias)).size !== limpios.dias.length && !errores.some((e) => e.campo === 'dias')) {
      errores.push({ campo: 'dias', code: 'DIA_SEMANA_INVALIDO' });
    }
    if (limpios.lideres.length > 0) {
      const personas = await this.prisma.persona.findMany({
        where: { id: { in: limpios.lideres } },
        select: { id: true, activo: true, estado: true, fechaNacimiento: true },
      });
      const hoy = hoyEnArgentina();
      if (personas.length !== limpios.lideres.length || personas.some((p) => !p.activo || p.estado !== 'activa')) {
        errores.push({ campo: 'lideres', code: 'LIDER_NO_DISPONIBLE' });
      } else if (personas.some((p) => esMenorDeEdad(p.fechaNacimiento.toISOString(), hoy))) {
        errores.push({ campo: 'lideres', code: 'LIDER_MENOR_DE_EDAD' });
      }
    }
    if (limpios.enLaIglesia && limpios.sedeId) {
      const sede = await this.prisma.sede.findUnique({ where: { id: limpios.sedeId }, select: { activo: true, eliminadoEn: true } });
      if (!sede || !sede.activo || sede.eliminadoEn) errores.push({ campo: 'sedeId', code: 'SEDE_INVALIDA' });
    }
    if (errores.length > 0) throw new AppException('VALIDACION', 400, 'Uno o más campos no son válidos.', errores);
    return limpios;
  }

  private columnas(d: DatosGrupoExtension) {
    return {
      nombre: d.nombre,
      dias: d.dias,
      horaInicio: d.horaInicio,
      cupo: d.cupo,
      edadMinima: d.edadMinima,
      edadMaxima: d.edadMaxima,
      enLaIglesia: d.enLaIglesia,
      sedeId: d.sedeId,
      calle: d.calle,
      numero: d.numero,
      entreCalle1: d.entreCalle1,
      entreCalle2: d.entreCalle2,
      zona: d.zona,
    } satisfies Partial<Prisma.GrupoExtensionUncheckedCreateInput>;
  }

  private async ubicar(d: DatosGrupoExtension): Promise<{ latitud: number | null; longitud: number | null }> {
    const direccionSede = d.enLaIglesia && d.sedeId ? ((await this.prisma.sede.findUnique({ where: { id: d.sedeId }, select: { direccion: true } }))?.direccion ?? null) : null;
    const consultas = consultasDeGeocodificacion({ ...d, direccionSede });
    const coordenadas = await ubicarPrimera(this.geocodificador, consultas);
    return { latitud: coordenadas?.latitud ?? null, longitud: coordenadas?.longitud ?? null };
  }
}
