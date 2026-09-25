import { Injectable } from '@nestjs/common';
import {
  EDAD_MINIMA_ROL_DE_CARGO,
  type RolDeCargo,
} from '@vida-sobrenatural/shared-types';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AppException } from '../common/errors/app-exception.js';
import { calcularEdad } from './calcular-edad.js';
import { CambioDeRolService } from '../cambio-de-rol/cambio-de-rol.service.js';

export interface RolesDePersona {
  id: string;
  rol: string[];
}

interface PersonaBloqueada extends RolesDePersona {
  fechaNacimiento: Date;
  adminSembrado: boolean;
}

/**
 * specs/005-roles-permisos-acceso, Historia 2 (contracts/roles-personas-api.md):
 * otorgar y quitar roles de CARGO (D131) — siempre una acción manual del
 * Admin. Los roles de ESTADO del proceso (`miembro_registrado`, …) no pasan
 * por acá (FR-019). Cada rechazo tiene su código propio (Principio X), nunca
 * un 403 genérico: el backoffice los muestra tal cual.
 */
@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cambiosDeRol: CambioDeRolService,
  ) {}

  /**
   * POST /personas/:id/roles — FR-006: independiente de cualquier otro paso
   * (D131: `discipulador` no depende de tener un Grupo). Acumulativo, e
   * idempotente si ya lo tiene (Edge Case de spec.md: éxito, no error).
   *
   * H-142: lectura, decisión y escritura en UNA transacción, con la fila de la
   * Persona bloqueada (`SELECT … FOR UPDATE`) y la escritura atómica
   * (`array_append` condicionado, mismo patrón que RolesDeEstadoService). Antes
   * se leía afuera y se escribía el arreglo entero desde ese snapshot: dos
   * cambios simultáneos perdían uno, y los DOS dejaban fila de auditoría.
   */
  // H-140: `realizadoPorId: string`, no `string | null`. Antes este método
  // recibía el autor y lo DESCARTABA (`_adminId`) — el dato viajaba y se
  // tiraba, y el tipo lo permitía. El controller resuelve el autor ANTES de
  // llamar (sesión sin Persona → SESION_SIN_PERSONA); acá ya no puede faltar.
  async otorgarRol(personaId: string, rol: RolDeCargo, realizadoPorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const persona = await this.bloquearOFallar(tx, personaId);

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

      const cambiada = await tx.$queryRaw<RolesDePersona[]>`
        UPDATE "personas" SET "rol" = array_append("rol", ${rol}::text), "updatedAt" = NOW()
        WHERE "id" = ${personaId} AND NOT (${rol}::text = ANY("rol"))
        RETURNING "id", "rol"`;
      // Idempotente: si ya lo tenía, el UPDATE no tocó nada y no hay cambio que
      // registrar (FR-022 audita cambios, no intentos).
      if (cambiada.length === 0) {
        return { id: persona.id, rol: persona.rol };
      }
      // FR-022/FR-023: el registro nace del cambio que efectivamente ocurrió, en
      // la misma transacción — no puede quedar uno sin el otro.
      await this.cambiosDeRol.registrar(
        {
          personaId,
          rol,
          accion: 'otorgado',
          actor: { origen: 'backoffice', realizadoPorId },
        },
        tx,
      );
      return cambiada[0];
    });
  }

  /**
   * DELETE /personas/:id/roles/:rol — FR-007: quita solo ese rol, los demás
   * quedan (acumulativos). Idempotente si no lo tenía. Mismo esquema que
   * otorgarRol (H-142): fila bloqueada, guardas sobre el estado actual,
   * `array_remove` condicionado.
   */
  async quitarRol(personaId: string, rol: RolDeCargo, realizadoPorId: string) {
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

    return this.prisma.$transaction(async (tx) => {
      const persona = await this.bloquearOFallar(tx, personaId);

      if (rol === 'admin' && persona.adminSembrado) {
        // FR-002 (D131): la garantía de que la iglesia nunca se queda sin
        // alguien que pueda administrar — sin importar quién lo pida. Leído con
        // la fila bloqueada: vale aunque db:recrear-admin la marque a la vez.
        throw new AppException(
          'NO_SE_PUEDE_DEGRADAR_AL_ADMIN_SEMBRADO',
          409,
          'Esta Persona es el Admin sembrado de la instalación: su rol de Admin no se puede quitar desde el backoffice.',
        );
      }
      // H-140: con el autor obligatorio por tipo, esta comparación ya no puede
      // ser `personaId === null` (falsa siempre): antes, para una sesión sin
      // Persona, FR-010 no existía — respondía "no es él" cuando la respuesta
      // era "no sé quién es". Ese caso lo corta el controller, primero.
      if (rol === 'admin' && personaId === realizadoPorId) {
        // FR-010: solo `admin` — quitarse otro rol de cargo a uno mismo sí se puede.
        throw new AppException(
          'ADMIN_NO_PUEDE_AUTO_REVOCARSE',
          409,
          'Un Admin no puede quitarse a sí mismo el rol de Admin.',
        );
      }

      const cambiada = await tx.$queryRaw<RolesDePersona[]>`
        UPDATE "personas" SET "rol" = array_remove("rol", ${rol}::text), "updatedAt" = NOW()
        WHERE "id" = ${personaId} AND ${rol}::text = ANY("rol")
        RETURNING "id", "rol"`;
      if (cambiada.length === 0) {
        return { id: persona.id, rol: persona.rol };
      }
      await this.cambiosDeRol.registrar(
        {
          personaId,
          rol,
          accion: 'quitado',
          actor: { origen: 'backoffice', realizadoPorId },
        },
        tx,
      );
      return cambiada[0];
    });
  }

  /**
   * H-142: lee la Persona BLOQUEANDO su fila hasta el fin de la transacción —
   * un cambio de rol concurrente sobre la misma Persona espera acá, y lee el
   * estado que dejó el anterior, no un snapshot previo.
   */
  private async bloquearOFallar(
    tx: Prisma.TransactionClient,
    personaId: string,
  ): Promise<PersonaBloqueada> {
    const filas = await tx.$queryRaw<PersonaBloqueada[]>`
      SELECT "id", "rol", "fechaNacimiento", "adminSembrado" FROM "personas" WHERE "id" = ${personaId} FOR UPDATE`;
    if (filas.length === 0) {
      throw new AppException(
        'NO_ENCONTRADO',
        404,
        'No existe una Persona con ese id.',
      );
    }
    return filas[0];
  }
}
