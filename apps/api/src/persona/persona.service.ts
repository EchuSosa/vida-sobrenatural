import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  EstadoPersona,
  TemaPreferido,
  OrigenConsentimiento,
  OrigenAlta,
  TipoRelacionFamiliar,
} from '../generated/prisma/enums.js';
import {
  EDAD_MINIMA_ROL_DE_CARGO,
  ROLES_DE_CARGO,
  normalizarEmail,
  puedeQuitarRol,
  type ResultadoQuitarRol,
  type RolDeCargo,
} from '@vida-sobrenatural/shared-types';
import { calcularEdad, nacidosAntesDeParaEdad } from './calcular-edad.js';
import { RolesDeEstadoService } from './roles-de-estado.service.js';
import { AppException } from '../common/errors/app-exception.js';
import {
  discipuladosActivosDeVarias,
  gruposServicioActivosDeVarias,
  propuestasPendientesDeVarias,
} from '../discipulado/discipulados-activos.js';
import type { RegistroPersonaDto } from './dto/registro-persona.dto.js';
import type { ActivarPersonaDto } from './dto/activar-persona.dto.js';
import type { ActualizarPerfilDto } from './dto/actualizar-perfil.dto.js';

const EDAD_MINIMA = 18;

// specs/005 (T017, FR-005): `rol` para ver los roles actuales. Sin
// `fechaNacimiento`: no hace falta exponerla para identificar a nadie.
const BUSQUEDA_PERSONA_SELECT = {
  id: true,
  nombre: true,
  apellido: true,
  email: true,
  telefono: true,
  rol: true,
} as const;

// specs/005, Historia 2: el listado de la pantalla Personas. Hoy coincide
// con BUSQUEDA_PERSONA_SELECT, pero es otro caso de uso — la vista de
// Flujo 9 va a sumar columnas acá sin que el buscador de tutor cambie.
const PERSONA_LISTADO_SELECT = {
  id: true,
  nombre: true,
  apellido: true,
  email: true,
  telefono: true,
  rol: true,
  // T062: solo para evaluar `puedeQuitarRol` (FR-002) — no se expone.
  adminSembrado: true,
} as const;

// D112: inversa de cada tipo de Relación Familiar (para detectar el
// "duplicado espejo" — el mismo vínculo cargado desde el otro lado). `tutor`
// no tiene un valor inverso en el enum ("a_cargo" se resuelve en código al
// consultar, no se guarda) — no puede haber espejo para ese tipo.
const INVERSO_RELACION: Partial<
  Record<TipoRelacionFamiliar, TipoRelacionFamiliar>
> = {
  [TipoRelacionFamiliar.hijo_a]: TipoRelacionFamiliar.padre_madre,
  [TipoRelacionFamiliar.padre_madre]: TipoRelacionFamiliar.hijo_a,
  [TipoRelacionFamiliar.conyuge]: TipoRelacionFamiliar.conyuge,
  [TipoRelacionFamiliar.hermano_a]: TipoRelacionFamiliar.hermano_a,
};

const PENDIENTE_TUTOR_SELECT = {
  id: true,
  nombre: true,
  apellido: true,
  telefono: true,
  fechaNacimiento: true,
  sedeId: true,
  createdAt: true,
} as const;

@Injectable()
export class PersonaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rolesDeEstado: RolesDeEstadoService,
  ) {}

  /** GET /personas/by-email — uso interno, ver contracts/auth-integration.md. */
  async findByEmail(email: string) {
    const persona = await this.prisma.persona.findUnique({
      // spec 007 (FR-010): mismo email → misma Persona, escrito como sea.
      where: { email: normalizarEmail(email) },
      // temaPreferido: para que NextAuth pueda hidratar session.user.temaPreferido
      // sin flash (specs/002-base-transversal, research.md Decisión 3).
      select: {
        id: true,
        estado: true,
        activo: true,
        rol: true,
        temaPreferido: true,
      },
    });
    if (!persona) {
      throw new AppException(
        'NO_ENCONTRADO',
        404,
        'No existe una Persona con ese email.',
      );
    }
    return persona;
  }

  /** GET /personas/me — Historia 5 (specs/002-base-transversal). */
  async obtenerPerfilPropio(personaId: string | null) {
    if (!personaId) {
      throw new AppException(
        'NO_ENCONTRADO',
        404,
        'Esta sesión todavía no tiene una Persona asociada.',
      );
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
        // H-35 (revisión manual ronda 3): base del self-edit de Perfil.
        telefono: true,
        direccion: true,
        estadoCivil: true,
        profesion: true,
        profesionDetalle: true,
      },
    });
    if (!persona) {
      throw new AppException(
        'NO_ENCONTRADO',
        404,
        'Esta sesión todavía no tiene una Persona asociada.',
      );
    }
    return persona;
  }

  /** PATCH /personas/me — H-35, Flujo 11 (FR-028/FR-029): cualquier subconjunto de los 4 campos. */
  async actualizarPerfilPropio(
    personaId: string | null,
    dto: ActualizarPerfilDto,
  ) {
    if (!personaId) {
      throw new AppException(
        'NO_ENCONTRADO',
        404,
        'Esta sesión todavía no tiene una Persona asociada.',
      );
    }
    return this.prisma.persona.update({
      where: { id: personaId },
      data: {
        telefono: dto.telefono,
        direccion: dto.direccion,
        estadoCivil: dto.estadoCivil,
        profesion: dto.profesion,
        // Solo tiene sentido cuando profesion = otro en esta misma petición
        // (el DTO ya lo exige en ese caso) — igual que en el registro.
        profesionDetalle: dto.profesion ? dto.profesionDetalle : undefined,
      },
      select: {
        id: true,
        telefono: true,
        direccion: true,
        estadoCivil: true,
        profesion: true,
        profesionDetalle: true,
      },
    });
  }

  /** PATCH /personas/me/preferencias — Historia 5, FR-027/FR-028. */
  async actualizarPreferenciasPropias(
    personaId: string | null,
    temaPreferido: TemaPreferido,
  ) {
    if (!personaId) {
      throw new AppException(
        'NO_ENCONTRADO',
        404,
        'Esta sesión todavía no tiene una Persona asociada.',
      );
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
      throw new AppException(
        'SEDE_INVALIDA',
        400,
        'La Sede indicada no existe o no está activa.',
      );
    }

    const fechaNacimiento = new Date(dto.fechaNacimiento);
    const esMayorDeEdad = calcularEdad(fechaNacimiento) >= EDAD_MINIMA;

    if (esMayorDeEdad && !dto.consentimientoDatos) {
      // FR-013: el consentimiento del propio adulto es obligatorio en el
      // formulario. H-104: `errors` con el campo — sin esto, el cliente no
      // tiene forma de mostrarlo junto a la casilla ni de sumarlo al
      // resumen (erroresPorCampo lo descarta si no viene, y cae al banner
      // genérico de arriba, invisible sin scrollear).
      throw new AppException(
        'CONSENTIMIENTO_REQUERIDO',
        400,
        'Se requiere el consentimiento de almacenamiento de datos para completar el registro.',
        [{ campo: 'consentimientoDatos', code: 'CONSENTIMIENTO_REQUERIDO' }],
      );
    }

    try {
      // FR-020/H-139: el rol de estado no va en el `create` — lo escribe el
      // lugar único, en la misma transacción (nace sin roles; si es mayor de
      // edad, recibe miembro_registrado).
      return await this.prisma.$transaction(async (tx) => {
        const creada = await tx.persona.create({
          data: {
            email: normalizarEmail(emailDeSesion),
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
            congregaDesde: dto.congregaDesde,
            fotoUrl: dto.fotoUrl,
            estado: esMayorDeEdad
              ? EstadoPersona.activa
              : EstadoPersona.pendiente_tutor,
            // El menor no autoconsiente (FR-013) — su consentimiento llega recién
            // al activar, vía el tutor (ver `activar` más abajo).
            consentimientoDatos: esMayorDeEdad
              ? dto.consentimientoDatos
              : false,
            // Actualización 2026-09-17 (FR-013): fecha/origen solo cuando el
            // consentimiento se da acá mismo (mayor de edad, origen 'app').
            consentimientoDatosFecha: esMayorDeEdad ? new Date() : null,
            consentimientoDatosOrigen: esMayorDeEdad
              ? OrigenConsentimiento.app
              : null,
            // Actualización 2026-09-17 (FR-015, D97): esta fase solo produce
            // autorregistro — el alta por Admin es una feature propia.
            origenAlta: OrigenAlta.autorregistro,
            altaPor: null,
          },
          select: { id: true, estado: true },
        });
        if (esMayorDeEdad) {
          await this.rolesDeEstado.otorgarRolDeEstado(
            creada.id,
            'miembro_registrado',
            tx,
          );
        }
        return creada;
      });
    } catch (error) {
      // FR-009: además del chequeo previo (evitado aquí a propósito para no
      // duplicar una consulta), el constraint único de `email` es la fuente de
      // verdad ante un registro simultáneo con el mismo email (condición de
      // carrera — ver spec.md, Edge Cases).
      if (isUniqueConstraintViolation(error, 'email')) {
        throw new AppException(
          'EMAIL_DUPLICADO',
          409,
          'Ya existe una Persona registrada con este email.',
        );
      }
      throw error;
    }
  }

  /**
   * GET /personas/pendientes-tutor — Historia 2b, Acceptance Scenario 3.
   * H-42 (revisión manual, revisión de código, Restricción Técnica "acceso a
   * datos"): paginado — `skip`/`take` acotado por el controller.
   *
   * H-88 (D126): `buscar` filtra en la API, no en memoria — a diferencia de
   * Sedes/Libros/Palabra Profética (listados chicos), esta cola pagina de
   * verdad (Personas va a ser cientos), así que filtrar en el cliente solo
   * vería la página ya cargada. Mismo patrón `OR contains insensitive` que
   * `buscarPersonas` (H-29), acotado a los campos que esta pantalla
   * muestra (nombre/apellido/teléfono — no email, que acá no se ve).
   *
   * Revisión del criterio de H-88: esa vez se decidió dejar esta pantalla
   * sin columnas ordenables porque "pagina de verdad" y "ordenar en
   * cliente sería incorrecto acá" — lo primero es cierto, lo segundo no
   * era la conclusión correcta. `orden`/`direccion` viajan igual que
   * `buscar` — ordenar EN el servidor, no en memoria — por el mismo
   * motivo: ordenar solo la página ya cargada daría un orden roto apenas
   * hubiera una segunda página.
   */
  async findPendientesTutor(
    skip: number,
    take: number,
    buscar?: string,
    orden: 'nombre' | 'createdAt' = 'createdAt',
    direccion: 'asc' | 'desc' = 'asc',
  ) {
    const termino = buscar?.trim();
    const where = {
      estado: EstadoPersona.pendiente_tutor,
      activo: true,
      ...(termino
        ? {
            OR: [
              { nombre: { contains: termino, mode: 'insensitive' as const } },
              { apellido: { contains: termino, mode: 'insensitive' as const } },
              { telefono: { contains: termino, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.persona.findMany({
        where,
        select: PENDIENTE_TUTOR_SELECT,
        orderBy: { [orden]: direccion },
        skip,
        take,
      }),
      this.prisma.persona.count({ where }),
    ]);
    return { items, total };
  }

  /**
   * GET /personas — specs/005, Historia 2 (FR-005): el listado paginado de la
   * pantalla Personas. Endpoint propio y no una extensión de `buscarPersonas`
   * (ver abajo): aquel devuelve 10 resultados sin total para elegir un tutor;
   * este pagina de verdad (Personas es el listado que más va a crecer), con
   * búsqueda y orden resueltos acá, en la base — mismo patrón que
   * `findPendientesTutor` (H-42/H-88).
   *
   * `soloMayores` (FR-024) es opcional y por defecto `false`: el significado
   * natural de este endpoint es "listar Personas", y esconder gente tiene que
   * ser algo que una pantalla pide explícitamente. La vista de Flujo 9 va a
   * necesitar ver a los menores (un `pendiente_tutor` es menor por definición
   * y hay que poder activarlo).
   *
   * Dos capas distintas, que no hay que confundir:
   * - FR-011 es la GARANTÍA: `RolesService.otorgarRol` rechaza darle un rol
   *   de cargo a un menor, venga el pedido por donde venga.
   * - FR-024 es solo la COMODIDAD de no mostrar en el listado de ascender
   *   roles a alguien a quien no se va a poder ascender.
   * Sacar este filtro no toca la protección; sacar el chequeo de otorgarRol,
   * sí.
   */
  async listarPersonas(
    skip: number,
    take: number,
    buscar?: string,
    orden: 'nombre' | 'apellido' = 'apellido',
    direccion: 'asc' | 'desc' = 'asc',
    soloMayores = false,
    // T062: quién mira — `puedeQuitarRol` depende de él (FR-010). null = una
    // sesión sin Persona, que no puede quitar nada (SESION_SIN_PERSONA, H-140).
    autorId: string | null = null,
  ) {
    const termino = buscar?.trim();
    const where = {
      activo: true,
      ...(soloMayores
        ? {
            fechaNacimiento: {
              lt: nacidosAntesDeParaEdad(EDAD_MINIMA_ROL_DE_CARGO),
            },
          }
        : {}),
      ...(termino
        ? {
            OR: [
              { nombre: { contains: termino, mode: 'insensitive' as const } },
              { apellido: { contains: termino, mode: 'insensitive' as const } },
              { email: { contains: termino, mode: 'insensitive' as const } },
              { telefono: { contains: termino, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    // Desempate por el otro campo del nombre y por id: sin un orden total,
    // Postgres puede repetir o saltear filas entre una página y la siguiente.
    const segundo = orden === 'apellido' ? 'nombre' : 'apellido';
    const [items, total] = await Promise.all([
      this.prisma.persona.findMany({
        where,
        select: PERSONA_LISTADO_SELECT,
        orderBy: [
          { [orden]: direccion },
          { [segundo]: direccion },
          { id: 'asc' },
        ],
        skip,
        take,
      }),
      this.prisma.persona.count({ where }),
    ]);
    // specs/004, T056 (D137): los discipulados activos y las propuestas
    // pendientes de TODA la página, en lote — la cantidad de consultas no
    // crece con las filas. Los mismos datos que consulta quitarRol, para que
    // la pantalla y la API respondan igual.
    const ids = items.map((p) => p.id);
    const [discipuladosPorPersona, propuestasPorPersona, gruposServicioPorPersona] = await Promise.all([
      discipuladosActivosDeVarias(this.prisma, ids),
      propuestasPendientesDeVarias(this.prisma, ids),
      gruposServicioActivosDeVarias(this.prisma, ids),
    ]);
    // T062 (D132): por cada rol de cargo, si quien mira se lo puede quitar y,
    // si no, por qué — la misma función con la que quitarRol rechaza. La
    // pantalla no ofrece lo que la API va a rechazar.
    return {
      items: items.map(({ adminSembrado, ...persona }) => {
        const datos = {
          id: persona.id,
          adminSembrado,
          discipuladosActivos: discipuladosPorPersona.get(persona.id) ?? [],
          propuestasPendientes: propuestasPorPersona.get(persona.id) ?? [],
          gruposServicioActivos: gruposServicioPorPersona.get(persona.id) ?? [],
        };
        return {
          ...persona,
          quitar: Object.fromEntries(
            ROLES_DE_CARGO.map((rol) => [rol, puedeQuitarRol(rol, datos, autorId)]),
          ) as Record<RolDeCargo, ResultadoQuitarRol>,
        };
      }),
      total,
    };
  }

  /**
   * GET /personas/buscar?q= — Historia 2b, H-29 (D108): elegir el tutor a
   * vincular. `take: 10` alcanza mientras la tabla es chica — H-42: este
   * `OR` con `contains` recorre la tabla entera (Postgres no puede usar un
   * índice B-tree normal para `LIKE '%texto%'`); si `Persona` crece a miles
   * de filas, va a necesitar un índice de texto (`pg_trgm` + índice GIN por
   * trigram) en vez de (o además de) subir `take`.
   *
   * specs/005: a propósito NO filtra por EDAD_MINIMA_ROL_DE_CARGO (D133).
   * Esa regla es de otro caso de uso (ascender roles, que usa
   * `listarPersonas`); si gobernara esta búsqueda, un cambio del umbral de
   * D133 movería en silencio quién puede ser tutor (la forma de H-128). La
   * mayoría de edad del tutor la garantiza `activar`, con su propia regla.
   */
  buscarPersonas(q: string) {
    const termino = q.trim();
    if (termino.length < 2) return [];
    return this.prisma.persona.findMany({
      where: {
        activo: true,
        OR: [
          { nombre: { contains: termino, mode: 'insensitive' } },
          { apellido: { contains: termino, mode: 'insensitive' } },
          { email: { contains: termino, mode: 'insensitive' } },
          { telefono: { contains: termino, mode: 'insensitive' } },
        ],
      },
      select: BUSQUEDA_PERSONA_SELECT,
      orderBy: { nombre: 'asc' },
      take: 10,
    });
  }

  /**
   * PATCH /personas/:id/activar — FR-008 (Flujo 7 camino A) + FR-023 (H-29,
   * D108/D112): exactamente uno de `tutorPersonaId` (vincula una Relación
   * Familiar tipo `tutor`, y vacía tutorNombre/tutorApellido/tutorTelefono —
   * el vínculo es la única fuente de verdad, D112) o
   * tutorNombre+tutorApellido+tutorTelefono (texto libre, cuando el tutor no
   * se congrega).
   */
  async activar(id: string, dto: ActivarPersonaDto) {
    const persona = await this.buscarPendienteTutorActivoOFallar(id);

    const tieneVinculo = !!dto.tutorPersonaId;
    const tieneTexto =
      !!dto.tutorNombre || !!dto.tutorApellido || !!dto.tutorTelefono;
    if (
      tieneVinculo === tieneTexto ||
      (tieneTexto &&
        !(dto.tutorNombre && dto.tutorApellido && dto.tutorTelefono))
    ) {
      throw new AppException(
        'ACTIVAR_TUTOR_INVALIDO',
        400,
        'Elegí una Persona para vincular como tutor, o completá tutorNombre, tutorApellido y tutorTelefono — no ambos ni ninguno.',
      );
    }

    const datosBase = {
      estado: EstadoPersona.activa,
      // El consentimiento definitivo lo da el tutor en este paso, no el
      // menor en el formulario (FR-013; ver data-model.md).
      consentimientoDatos: true,
      // Actualización 2026-09-17 (FR-013): origen 'presencial' — el
      // consentimiento se toma fuera del sistema, durante el contacto
      // manual del Admin/Discipulador con el tutor.
      consentimientoDatosFecha: new Date(),
      consentimientoDatosOrigen: OrigenConsentimiento.presencial,
      // FR-020/H-139: SIN `rol` acá. Antes decía `rol: ['miembro_registrado']`
      // y PISABA el arreglo: un rol de cargo otorgado mientras la Persona
      // esperaba al tutor (la guarda de edad mira la fecha, no el estado,
      // H-128) desaparecía sin error. Lo agrega el lugar único, abajo.
    };

    if (!dto.tutorPersonaId) {
      return this.prisma.$transaction(async (tx) => {
        const actualizada = await tx.persona.update({
          where: { id: persona.id },
          data: {
            ...datosBase,
            tutorNombre: dto.tutorNombre,
            tutorApellido: dto.tutorApellido,
            tutorTelefono: dto.tutorTelefono,
          },
          select: { id: true, estado: true },
        });
        await this.rolesDeEstado.otorgarRolDeEstado(
          persona.id,
          'miembro_registrado',
          tx,
        );
        return actualizada;
      });
    }

    const tutor = await this.validarVinculoFamiliar(
      persona.id,
      dto.tutorPersonaId,
      TipoRelacionFamiliar.tutor,
    );
    // H-74 (revisión manual ronda 8, D35): invariante propia de "tutor", no
    // de un vínculo familiar en general — un tutor tiene que ser un
    // miembro ya verificado (`estado: activa`, no otro pendiente_tutor sin
    // verificar ni el propio menor) y mayor de edad. `buscarPersonas` (la
    // búsqueda que arma la lista de candidatos) debería filtrar esto
    // también, pero es una comodidad de UI, no la barrera real: la barrera
    // real es acá, del lado del servidor, para quien llame a este endpoint
    // directamente.
    if (
      tutor.estado !== EstadoPersona.activa ||
      calcularEdad(tutor.fechaNacimiento) < EDAD_MINIMA
    ) {
      throw new AppException(
        'TUTOR_INVALIDO',
        400,
        'La Persona elegida como tutor no es válida: tiene que ser un miembro activo y mayor de edad.',
      );
    }

    const tutorPersonaId = dto.tutorPersonaId;
    return this.prisma.$transaction(async (tx) => {
      await tx.relacionFamiliar.create({
        data: {
          personaId: persona.id,
          familiarId: tutorPersonaId,
          tipoRelacion: TipoRelacionFamiliar.tutor,
        },
      });
      const actualizada = await tx.persona.update({
        where: { id: persona.id },
        data: {
          ...datosBase,
          tutorNombre: null,
          tutorApellido: null,
          tutorTelefono: null,
        },
        select: { id: true, estado: true },
      });
      await this.rolesDeEstado.otorgarRolDeEstado(
        persona.id,
        'miembro_registrado',
        tx,
      );
      return actualizada;
    });
  }

  /**
   * D112: valida antes de crear una Relación Familiar — ninguna Persona
   * puede vincularse consigo misma, y no se puede duplicar el mismo vínculo
   * ni cargarlo espejado desde el otro lado (ej. A-hijo_a-B cuando ya existe
   * B-padre_madre-A). Genérica a los cinco tipos de vínculo — devuelve la
   * Persona vinculada (ya la busca acá) para que el llamador la reutilice
   * sin una segunda consulta; las invariantes propias de un tipo puntual
   * (ej. "tutor" — ver `activar`) NO van acá, van del lado que sí las
   * conoce.
   */
  private async validarVinculoFamiliar(
    personaId: string,
    familiarId: string,
    tipo: TipoRelacionFamiliar,
  ) {
    if (personaId === familiarId) {
      throw new AppException(
        'RELACION_FAMILIAR_INVALIDA',
        400,
        'Una Persona no puede vincularse consigo misma.',
      );
    }
    const familiar = await this.prisma.persona.findUnique({
      where: { id: familiarId },
    });
    if (!familiar) {
      throw new AppException(
        'NO_ENCONTRADO',
        404,
        'La Persona a vincular no existe.',
      );
    }

    const duplicadoLiteral = await this.prisma.relacionFamiliar.findUnique({
      where: {
        personaId_familiarId_tipoRelacion: {
          personaId,
          familiarId,
          tipoRelacion: tipo,
        },
      },
    });
    if (duplicadoLiteral) {
      throw new AppException(
        'RELACION_FAMILIAR_INVALIDA',
        409,
        'Ese vínculo ya existe.',
      );
    }

    const inversa = INVERSO_RELACION[tipo];
    if (inversa) {
      const duplicadoEspejo = await this.prisma.relacionFamiliar.findUnique({
        where: {
          personaId_familiarId_tipoRelacion: {
            personaId: familiarId,
            familiarId: personaId,
            tipoRelacion: inversa,
          },
        },
      });
      if (duplicadoEspejo) {
        throw new AppException(
          'RELACION_FAMILIAR_INVALIDA',
          409,
          'Ese vínculo ya existe (cargado desde el otro lado).',
        );
      }
    }

    return familiar;
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
    if (
      !persona ||
      persona.estado !== EstadoPersona.pendiente_tutor ||
      !persona.activo
    ) {
      throw new AppException(
        'PERSONA_NO_PENDIENTE_TUTOR',
        409,
        'La Persona no está en estado pendiente_tutor.',
      );
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
  if (
    typeof error !== 'object' ||
    error === null ||
    (error as { code?: unknown }).code !== 'P2002'
  ) {
    return false;
  }
  const meta = (
    error as {
      meta?: {
        driverAdapterError?: { cause?: { constraint?: { index?: string } } };
      };
    }
  ).meta;
  const constraintIndex =
    meta?.driverAdapterError?.cause?.constraint?.index ?? '';
  return constraintIndex.includes(field);
}
