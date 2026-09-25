import { Injectable } from '@nestjs/common';
import { EDAD_MINIMA_ROL_DE_CARGO, type RolDeCargo } from '@vida-sobrenatural/shared-types';
import { PrismaService } from '../prisma/prisma.service.js';
import { AppException } from '../common/errors/app-exception.js';
import { calcularEdad } from './calcular-edad.js';

const ROLES_SELECT = { id: true, rol: true } as const;

/**
 * specs/005-roles-permisos-acceso, Historia 2 (contracts/roles-personas-api.md):
 * otorgar y quitar roles de CARGO (D131) — siempre una acción manual del
 * Admin. Los roles de ESTADO del proceso (`miembro_registrado`, …) no pasan
 * por acá (FR-019). Cada rechazo tiene su código propio (Principio X), nunca
 * un 403 genérico: el backoffice los muestra tal cual.
 */
@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * POST /personas/:id/roles — FR-006: independiente de cualquier otro paso
   * (D131: `discipulador` no depende de tener un Grupo). Acumulativo, e
   * idempotente si ya lo tiene (Edge Case de spec.md: éxito, no error).
   */
  async otorgarRol(personaId: string, rol: RolDeCargo, _adminId: string | null) {
    const persona = await this.buscarOFallar(personaId);

    // FR-011 — la GARANTÍA (D133/H-128): acá, y no en ningún listado, porque
    // tiene que valer venga el pedido por donde venga. El filtro de edad de
    // GET /personas?soloMayores=true (FR-024) es solo una comodidad de la
    // pantalla; sin este chequeo, no protegería nada.
    if (calcularEdad(persona.fechaNacimiento) < EDAD_MINIMA_ROL_DE_CARGO) {
      throw new AppException(
        'PERSONA_MENOR_DE_EDAD_NO_PUEDE_TENER_ROL_DE_CARGO',
        409,
        `Una Persona menor de ${EDAD_MINIMA_ROL_DE_CARGO} años no puede tener un rol de cargo.`,
      );
    }

    if (persona.rol.includes(rol)) {
      return { id: persona.id, rol: persona.rol };
    }
    return this.prisma.persona.update({
      where: { id: persona.id },
      data: { rol: [...persona.rol, rol] },
      select: ROLES_SELECT,
    });
  }

  /**
   * DELETE /personas/:id/roles/:rol — FR-007: quita solo ese rol, los demás
   * quedan (acumulativos). Idempotente si no lo tenía.
   */
  async quitarRol(personaId: string, rol: RolDeCargo, adminId: string | null) {
    // FR-009/H-127 — FALLO CERRADO, incondicional y antes que cualquier otra
    // cosa: "tiene discipulados activos a cargo" es una consulta contra el
    // spec 004, que todavía no existe. Mientras no exista, quitar
    // `discipulador` se rechaza SIEMPRE — no porque se haya verificado que
    // tiene discipulados, sino porque no se puede verificar que no los
    // tenga. Nada de "si no encontré nada, dejo pasar". La tarea del spec
    // 004 que conecte la consulta real reemplaza este bloque; hasta
    // entonces, no se le agrega ninguna condición.
    if (rol === 'discipulador') {
      throw new AppException(
        'DISCIPULADOR_SIN_VERIFICACION_DE_DISCIPULADOS_ACTIVOS',
        409,
        'Todavía no se puede quitar el rol de Discipulador: el sistema aún no puede verificar si esta Persona tiene discipulados a cargo.',
      );
    }

    const persona = await this.buscarOFallar(personaId);

    if (rol === 'admin' && persona.adminSembrado) {
      // FR-002 (D131): la garantía de que la iglesia nunca se queda sin
      // alguien que pueda administrar — sin importar quién lo pida.
      throw new AppException(
        'NO_SE_PUEDE_DEGRADAR_AL_ADMIN_SEMBRADO',
        409,
        'Esta Persona es el Admin sembrado de la instalación: su rol de Admin no se puede quitar desde el backoffice.',
      );
    }
    if (rol === 'admin' && personaId === adminId) {
      // FR-010: solo `admin` — quitarse otro rol de cargo a uno mismo sí se puede.
      throw new AppException('ADMIN_NO_PUEDE_AUTO_REVOCARSE', 409, 'Un Admin no puede quitarse a sí mismo el rol de Admin.');
    }

    if (!persona.rol.includes(rol)) {
      return { id: persona.id, rol: persona.rol };
    }
    return this.prisma.persona.update({
      where: { id: persona.id },
      data: { rol: persona.rol.filter((r) => r !== rol) },
      select: ROLES_SELECT,
    });
  }

  private async buscarOFallar(personaId: string) {
    const persona = await this.prisma.persona.findUnique({
      where: { id: personaId },
      select: { id: true, rol: true, fechaNacimiento: true, adminSembrado: true },
    });
    if (!persona) {
      throw new AppException('NO_ENCONTRADO', 404, 'No existe una Persona con ese id.');
    }
    return persona;
  }
}
