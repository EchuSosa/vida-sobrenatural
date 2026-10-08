import { Injectable } from '@nestjs/common';
import {
  anioEnArgentina,
  erroresDeDatosPersonales,
  esMenorDeEdad,
  hoyEnArgentina,
  normalizarDni,
  normalizarEmail,
  normalizarTelefono,
  sinAccesoALaApp,
  sonPosiblesDuplicados,
  type CoincidenciaDuplicado,
  type DatosPersonales,
  type PersonaConMismoDni,
} from '@vida-sobrenatural/shared-types';
import { PrismaService } from '../prisma/prisma.service.js';
import { AppException, type AppExceptionErrorField } from '../common/errors/app-exception.js';
import { NotificacionesService } from '../notificaciones/notificaciones.service.js';
import { RolesDeEstadoService } from './roles-de-estado.service.js';
import type { AltaPersonaDto } from './dto/alta-persona.dto.js';

/** Un email razonable: algo@algo.algo, sin espacios (el formato fino lo resuelve el proveedor al ingresar). */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


/**
 * spec 006, Historia 5 (contracts/personas-alta-api.md): el alta de una
 * Persona adulta por el Admin (D145, Flujo 12), con email opcional y aviso de
 * posible duplicado, y "Agregar email" a quien no tiene. D215: DNI opcional,
 * único (bloqueo fuerte, no aviso). Archivo propio: no
 * reescribe `PersonaService` (specs/IMPLEMENTACION.md §3).
 */
@Injectable()
export class AltaPersonaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rolesDeEstado: RolesDeEstadoService,
    private readonly notificaciones: NotificacionesService,
  ) {}

  /** POST /personas/alta (FR-031 a FR-036). */
  async alta(dto: AltaPersonaDto, autorId: string): Promise<{ id: string; nombre: string; apellido: string; sinAccesoALaApp: boolean }> {
    // 1. Todos los errores de campo juntos (H-50).
    const errores: AppExceptionErrorField[] = erroresDeDatosPersonales(dto, anioEnArgentina());
    const fechaOk = !errores.some((e) => e.campo === 'fechaNacimiento');
    if (fechaOk && esMenorDeEdad(String(dto.fechaNacimiento), hoyEnArgentina())) {
      errores.push({ campo: 'fechaNacimiento', code: 'ALTA_MENOR_DE_EDAD' });
    }
    const email = emailOpcional(dto.email);
    if (email === undefined) errores.push({ campo: 'email', code: 'EMAIL_INVALIDO' });
    // D215: opcional; si viene, 7 u 8 dígitos (con o sin puntos).
    const dni = normalizarDni(dto.dni);
    if (dni === undefined) errores.push({ campo: 'dni', code: 'DNI_INVALIDO' });
    if (dto.consentimiento !== true) errores.push({ campo: 'consentimiento', code: 'CONSENTIMIENTO_REQUERIDO' });
    if (errores.length > 0) throw new AppException('VALIDACION', 400, 'Uno o más campos no son válidos.', errores);

    const datos = dto as unknown as DatosPersonales;
    // 2. Email ya usado: bloqueo, en el campo (FR-034).
    if (email && (await this.prisma.persona.findUnique({ where: { email }, select: { id: true } }))) throw emailDuplicado();

    // 2b. DNI ya usado (D215): bloqueo fuerte, aunque se haya confirmado el
    // posible duplicado; se dice quién es para poder ir a su perfil. Entre
    // todas las Personas, activas o no (el índice único es la garantía).
    if (dni) {
      const conDni = await this.prisma.persona.findFirst({ where: { dni }, select: { id: true, nombre: true, apellido: true } });
      if (conDni) throw dniDuplicado(conDni);
    }

    // 3. Posible duplicado: aviso, no bloqueo (FR-035, D145).
    if (dto.confirmarPosibleDuplicado !== true) {
      const coincidencias = await this.posiblesDuplicados(datos);
      if (coincidencias.length > 0) {
        throw new AppException('POSIBLE_DUPLICADO', 409, 'Puede que esta Persona ya esté cargada.', undefined, { coincidencias });
      }
    }

    // 4. Crear, con su rol de estado en la misma transacción (FR-032).
    try {
      return await this.prisma.$transaction(async (tx) => {
        const creada = await tx.persona.create({
          data: {
            apellido: datos.apellido.trim(),
            nombre: datos.nombre.trim(),
            genero: datos.genero,
            fechaNacimiento: new Date(`${datos.fechaNacimiento.slice(0, 10)}T00:00:00.000Z`),
            telefono: datos.telefono,
            direccion: datos.direccion.trim(),
            sedeId: datos.sedeId,
            estadoCivil: datos.estadoCivil,
            profesion: datos.profesion,
            profesionDetalle: datos.profesion === 'otro' ? String(datos.profesionDetalle).trim() : null,
            congregaDesde: datos.congregaDesde,
            email,
            dni,
            estado: 'activa',
            consentimientoDatos: true,
            consentimientoDatosFecha: new Date(),
            consentimientoDatosOrigen: 'presencial',
            origenAlta: 'admin',
            altaPor: autorId,
          },
          select: { id: true, nombre: true, apellido: true, email: true },
        });
        await this.rolesDeEstado.otorgarRolDeEstado(creada.id, 'miembro_registrado', tx);
        // Flujo 12: la cuenta queda activa (catálogo de avisos, spec 012).
        await this.notificaciones.emitir(tx, { nombre: 'persona.cuenta_activada', a: { tipo: 'persona', personaId: creada.id }, datos: { personaId: creada.id } });
        return { id: creada.id, nombre: creada.nombre, apellido: creada.apellido, sinAccesoALaApp: sinAccesoALaApp(creada) };
      });
    } catch (error) {
      // Dos altas simultáneas con el mismo email: el índice único es la garantía.
      if (esUnicidadDeEmail(error)) throw emailDuplicado();
      if (dni && esUnicidadDe(error, 'dni')) {
        const conDni = await this.prisma.persona.findFirst({ where: { dni }, select: { id: true, nombre: true, apellido: true } });
        throw dniDuplicado(conDni);
      }
      if (typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 'P2003') {
        throw new AppException('VALIDACION', 400, 'Uno o más campos no son válidos.', [{ campo: 'sedeId', code: 'SEDE_INVALIDA' }]);
      }
      throw error;
    }
  }

  /**
   * FR-035 (research #7): Personas, activas o no, con el mismo teléfono
   * normalizado, o con el mismo nombre + apellido (sin tildes ni mayúsculas) y
   * la misma fecha de nacimiento. Los candidatos salen por índice
   * (`telefonoNormalizado`, `fechaNacimiento`); la comparación final es
   * `sonPosiblesDuplicados` de shared-types.
   */
  async posiblesDuplicados(datos: DatosPersonales): Promise<CoincidenciaDuplicado[]> {
    const telefono = normalizarTelefono(datos.telefono);
    const fecha = new Date(`${datos.fechaNacimiento.slice(0, 10)}T00:00:00.000Z`);
    const candidatos = await this.prisma.persona.findMany({
      where: { OR: [...(telefono ? [{ telefonoNormalizado: telefono }] : []), { fechaNacimiento: fecha }] },
      select: { id: true, nombre: true, apellido: true, fechaNacimiento: true, telefono: true, activo: true },
      take: 50,
    });
    return candidatos
      .map((c) => {
        const deC = { nombre: c.nombre, apellido: c.apellido, fechaNacimiento: c.fechaNacimiento.toISOString().slice(0, 10), telefono: c.telefono };
        // Un teléfono vacío (datos viejos) no coincide con nada.
        const porque = sonPosiblesDuplicados(datos, deC).filter((m) => m !== 'telefono' || normalizarTelefono(c.telefono) !== '');
        return { id: c.id, ...deC, activa: c.activo, porque };
      })
      .filter((c) => c.porque.length > 0);
  }

  /** PATCH /personas/:id/email (FR-037): solo a quien no tiene; editar uno existente es Flujo 9. */
  async agregarEmail(personaId: string, emailCrudo: unknown): Promise<{ id: string; email: string; sinAccesoALaApp: false }> {
    const email = emailOpcional(emailCrudo);
    if (!email) throw new AppException('VALIDACION', 400, 'Uno o más campos no son válidos.', [{ campo: 'email', code: 'EMAIL_INVALIDO' }]);
    const persona = await this.prisma.persona.findUnique({ where: { id: personaId }, select: { id: true, email: true } });
    if (!persona) throw new AppException('NO_ENCONTRADO', 404, 'No existe una Persona con ese id.');
    if (persona.email) throw new AppException('EMAIL_YA_CARGADO', 409, 'Esta Persona ya tiene un email cargado.');
    try {
      // `email: null` en el where: si otra pestaña lo cargó recién, no se pisa.
      const { count } = await this.prisma.persona.updateMany({ where: { id: personaId, email: null }, data: { email } });
      if (count === 0) throw new AppException('EMAIL_YA_CARGADO', 409, 'Esta Persona ya tiene un email cargado.');
    } catch (error) {
      if (esUnicidadDeEmail(error)) throw emailDuplicado();
      throw error;
    }
    return { id: personaId, email, sinAccesoALaApp: false };
  }
}

/** `null` = no vino (o vino vacío); `undefined` = vino con un formato que no es email; si no, normalizado. */
function emailOpcional(valor: unknown): string | null | undefined {
  if (valor === undefined || valor === null) return null;
  if (typeof valor !== 'string') return undefined;
  const email = normalizarEmail(valor);
  if (email === '') return null;
  return EMAIL.test(email) ? email : undefined;
}

function emailDuplicado() {
  return new AppException('EMAIL_DUPLICADO', 409, 'Ese email ya lo usa otra Persona.', [{ campo: 'email', code: 'EMAIL_DUPLICADO' }]);
}

/** D215: el DNI nunca viaja en la respuesta; solo quién lo tiene. Lo usa también la edición (013). */
export function dniDuplicado(persona: PersonaConMismoDni | null) {
  return new AppException(
    'DNI_DUPLICADO',
    409,
    'Ya hay una Persona con este DNI.',
    [{ campo: 'dni', code: 'DNI_DUPLICADO' }],
    persona ? { persona: { id: persona.id, nombre: persona.nombre, apellido: persona.apellido } } : undefined,
  );
}

function esUnicidadDeEmail(error: unknown): boolean {
  return esUnicidadDe(error, 'email');
}

/** P2002 del índice único de `campo` (email o dni). Lo usa también la edición (013). */
export function esUnicidadDe(error: unknown, campo: string): boolean {
  if (typeof error !== 'object' || error === null || (error as { code?: unknown }).code !== 'P2002') return false;
  const meta = (error as { meta?: { driverAdapterError?: { cause?: { constraint?: { index?: string } } }; target?: unknown } }).meta;
  const indice = meta?.driverAdapterError?.cause?.constraint?.index ?? JSON.stringify(meta?.target ?? '');
  return indice.includes(campo);
}
