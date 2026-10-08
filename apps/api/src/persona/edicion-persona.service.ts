import { Injectable } from '@nestjs/common';
import {
  ROLES_DE_CARGO,
  anioEnArgentina,
  erroresDeDatosPersonales,
  esMenorDeEdad,
  hoyEnArgentina,
  normalizarDni,
  normalizarEmail,
  type DatosPersonales,
  type PerfilPersona,
} from '@vida-sobrenatural/shared-types';
import { PrismaService } from '../prisma/prisma.service.js';
import { AppException, type AppExceptionErrorField } from '../common/errors/app-exception.js';
import { PerfilPersonaService } from './perfil-persona.service.js';
import { dniDuplicado, esUnicidadDe } from './alta-persona.service.js';

/** Los campos que el Admin corrige (los del alta de la 006, más el email — D145 — y el DNI — D215). */
export const CAMPOS_EDITABLES = [
  'apellido',
  'nombre',
  'genero',
  'fechaNacimiento',
  'telefono',
  'direccion',
  'sedeId',
  'estadoCivil',
  'profesion',
  'profesionDetalle',
  'congregaDesde',
  'email',
  'dni',
] as const;
type CampoEditable = (typeof CAMPOS_EDITABLES)[number];
export type CambiosPersona = Partial<Record<CampoEditable, unknown>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * spec 013, Historia 7 (T080, FR-057, FR-058): el Admin corrige los datos de
 * una Persona. Las reglas de cada dato son las del registro y del alta
 * (`erroresDeDatosPersonales`, una sola fuente); se validan sobre la Persona
 * con los cambios aplicados, y los errores salen solo para los campos
 * enviados (un dato viejo que no se toca no bloquea). D133: una fecha que la
 * vuelve menor con un rol de cargo se rechaza. El email se guarda normalizado
 * y único; vacío la deja sin acceso a la app (D145). El DNI (D215) con el
 * formato y la unicidad del alta; vacío lo borra. Archivo nuevo (mapa §3).
 */
@Injectable()
export class EdicionPersonaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly perfiles: PerfilPersonaService,
  ) {}

  async editar(id: string, cambios: CambiosPersona, autorId: string | null): Promise<PerfilPersona> {
    const actual = await this.prisma.persona.findUnique({
      where: { id },
      select: {
        apellido: true,
        nombre: true,
        genero: true,
        fechaNacimiento: true,
        telefono: true,
        direccion: true,
        sedeId: true,
        estadoCivil: true,
        profesion: true,
        profesionDetalle: true,
        congregaDesde: true,
        rol: true,
      },
    });
    if (!actual) throw new AppException('NO_ENCONTRADO', 404, 'No existe una Persona con ese id.');

    const enviados = CAMPOS_EDITABLES.filter((c) => c in cambios);
    const texto = (v: unknown) => (typeof v === 'string' ? v.trim() : v);
    const fusion: Partial<Record<keyof DatosPersonales, unknown>> = {
      ...actual,
      fechaNacimiento: actual.fechaNacimiento.toISOString().slice(0, 10),
      ...Object.fromEntries(enviados.filter((c) => c !== 'email' && c !== 'dni').map((c) => [c, texto(cambios[c])])),
    };
    // Si la profesión deja de ser "otro", el detalle se va con ella.
    if (fusion.profesion !== 'otro') fusion.profesionDetalle = null;

    const tocados = new Set<string>(enviados);
    if (tocados.has('profesion')) tocados.add('profesionDetalle');
    const errores: AppExceptionErrorField[] = erroresDeDatosPersonales(fusion, anioEnArgentina()).filter((e) => tocados.has(e.campo));

    let email: string | null | undefined;
    if ('email' in cambios) {
      email = emailOpcional(cambios.email);
      if (email === undefined) errores.push({ campo: 'email', code: 'EMAIL_INVALIDO' });
    }
    // D215: opcional; vacío lo borra. Mismo formato y unicidad que en el alta.
    let dni: string | null | undefined;
    if ('dni' in cambios) {
      dni = normalizarDni(cambios.dni);
      if (dni === undefined) errores.push({ campo: 'dni', code: 'DNI_INVALIDO' });
    }
    if (errores.length > 0) throw new AppException('VALIDACION', 400, 'Uno o más campos no son válidos.', errores);

    // D133: un menor no puede tener un rol de cargo — el mismo código que al otorgarlo.
    const fecha = String(fusion.fechaNacimiento).slice(0, 10);
    if (tocados.has('fechaNacimiento') && esMenorDeEdad(fecha, hoyEnArgentina()) && actual.rol.some((r) => (ROLES_DE_CARGO as readonly string[]).includes(r))) {
      throw new AppException(
        'PERSONA_MENOR_DE_EDAD_NO_PUEDE_TENER_ROL_DE_CARGO',
        409,
        'Con esa fecha de nacimiento sería menor de edad, y tiene un rol de cargo. Quitale el rol antes de corregir la fecha.',
        [{ campo: 'fechaNacimiento', code: 'PERSONA_MENOR_DE_EDAD_NO_PUEDE_TENER_ROL_DE_CARGO' }],
      );
    }

    if (email) {
      const otra = await this.prisma.persona.findFirst({ where: { email, id: { not: id } }, select: { id: true } });
      if (otra) throw emailDuplicado();
    }
    if (dni) {
      const conDni = await this.prisma.persona.findFirst({ where: { dni, id: { not: id } }, select: { id: true, nombre: true, apellido: true } });
      if (conDni) throw dniDuplicado(conDni);
    }

    const datos = {
      ...(tocados.has('apellido') ? { apellido: String(fusion.apellido) } : {}),
      ...(tocados.has('nombre') ? { nombre: String(fusion.nombre) } : {}),
      ...(tocados.has('genero') ? { genero: fusion.genero as DatosPersonales['genero'] } : {}),
      ...(tocados.has('fechaNacimiento') ? { fechaNacimiento: new Date(`${fecha}T00:00:00.000Z`) } : {}),
      ...(tocados.has('telefono') ? { telefono: String(fusion.telefono) } : {}),
      ...(tocados.has('direccion') ? { direccion: String(fusion.direccion) } : {}),
      ...(tocados.has('sedeId') ? { sedeId: String(fusion.sedeId) } : {}),
      ...(tocados.has('estadoCivil') ? { estadoCivil: fusion.estadoCivil as DatosPersonales['estadoCivil'] } : {}),
      ...(tocados.has('profesion') ? { profesion: fusion.profesion as DatosPersonales['profesion'] } : {}),
      ...(tocados.has('profesionDetalle') ? { profesionDetalle: typeof fusion.profesionDetalle === 'string' ? fusion.profesionDetalle : null } : {}),
      ...(tocados.has('congregaDesde') ? { congregaDesde: Number(fusion.congregaDesde) } : {}),
      ...(email !== undefined ? { email } : {}),
      ...(dni !== undefined ? { dni } : {}),
    };
    try {
      await this.prisma.persona.update({ where: { id }, data: datos });
    } catch (error) {
      const code = (error as { code?: unknown }).code;
      // Dos ediciones simultáneas: el índice único es la garantía.
      if (dni && esUnicidadDe(error, 'dni')) {
        const conDni = await this.prisma.persona.findFirst({ where: { dni, id: { not: id } }, select: { id: true, nombre: true, apellido: true } });
        throw dniDuplicado(conDni);
      }
      if (code === 'P2002') throw emailDuplicado();
      if (code === 'P2003') throw new AppException('VALIDACION', 400, 'Uno o más campos no son válidos.', [{ campo: 'sedeId', code: 'SEDE_INVALIDA' }]);
      throw error;
    }
    return this.perfiles.perfil(id, autorId);
  }
}

/** `null` = vacío (sin acceso a la app, D145); `undefined` = no es un email; si no, normalizado. */
function emailOpcional(valor: unknown): string | null | undefined {
  if (valor === null) return null;
  if (typeof valor !== 'string') return undefined;
  const email = normalizarEmail(valor);
  if (email === '') return null;
  return EMAIL.test(email) ? email : undefined;
}

function emailDuplicado() {
  return new AppException('EMAIL_DUPLICADO', 409, 'Ese email ya lo usa otra Persona.', [{ campo: 'email', code: 'EMAIL_DUPLICADO' }]);
}
