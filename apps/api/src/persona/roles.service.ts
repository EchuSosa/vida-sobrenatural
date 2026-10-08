import { Injectable } from '@nestjs/common';
import {
  EDAD_MINIMA_ROL_DE_CARGO,
  esMenorDeEdad,
  hoyEnArgentina,
  puedeQuitarRol,
  type MotivoNoQuitable,
  type RolDeCargo,
} from '@vida-sobrenatural/shared-types';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AppException } from '../common/errors/app-exception.js';
import { CambioDeRolService } from '../cambio-de-rol/cambio-de-rol.service.js';
import {
  discipuladosActivosDe,
  gruposServicioActivosDe,
  propuestasPendientesDe,
} from '../discipulado/discipulados-activos.js';

/** T062: el estado HTTP y el detalle de cada motivo de `puedeQuitarRol`. */
const RECHAZOS_DE_QUITAR: Record<
  MotivoNoQuitable,
  { estado: number; detalle: string }
> = {
  SESION_SIN_PERSONA: {
    estado: 403,
    detalle:
      'La sesión no tiene una Persona asociada: el sistema no puede registrar quién hace el cambio, así que no lo hace.',
  },
  DISCIPULADOR_TIENE_DISCIPULADOS_ACTIVOS: {
    estado: 409,
    detalle:
      'Esta Persona tiene discipulados a cargo o propuestas pendientes: reasignalos antes de quitarle el rol de Discipulador.',
  },
  NO_SE_PUEDE_DEGRADAR_AL_ADMIN_SEMBRADO: {
    estado: 409,
    detalle:
      'Esta Persona es el Admin sembrado de la instalación: su rol de Admin no se puede quitar desde el backoffice.',
  },
  LIDER_TIENE_GRUPOS_ACTIVOS: {
    estado: 409,
    detalle:
      'Esta Persona lidera ediciones de Vida de Servicio en curso: sacala de esas ediciones antes de quitarle el rol de Líder de curso.',
  },
  ADMIN_NO_PUEDE_AUTO_REVOCARSE: {
    estado: 409,
    detalle: 'Un Admin no puede quitarse a sí mismo el rol de Admin.',
  },
};

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
      // pantalla; sin este chequeo, no protegería nada. La regla es la de
      // shared-types (spec 013, research #14): una sola, con la fecha civil de
      // Argentina, la misma que usa el backoffice.
      if (esMenorDeEdad(persona.fechaNacimiento.toISOString(), hoyEnArgentina())) {
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
    return this.prisma.$transaction(async (tx) => {
      const persona = await this.bloquearOFallar(tx, personaId);

      // specs/004, D137 (cierra H-127): los discipulados activos y las
      // propuestas pendientes, consultados DESPUÉS de bloquear la fila. Aceptar
      // una propuesta o reasignar (lote B) bloquean esta misma fila y exigen
      // que siga teniendo el rol: si una de esas corre a la vez, una espera a
      // la otra, y esta ve el Liderazgo que la otra dejó. Solo para
      // `discipulador` — los otros roles no dependen de esto.
      const [discipuladosActivos, propuestasPendientes] =
        rol === 'discipulador'
          ? await Promise.all([
              discipuladosActivosDe(tx, personaId),
              propuestasPendientesDe(tx, personaId),
            ])
          : [[], []];
      // spec 008 (D167): lo mismo para `lider_curso` y sus ediciones en curso.
      const gruposServicioActivos = rol === 'lider_curso' ? await gruposServicioActivosDe(tx, personaId) : [];

      // T062 (D132): la MISMA función con la que la pantalla decide si ofrece
      // "Quitar" — no tres guardas escritas acá y otras tres allá. Evaluada con
      // la fila bloqueada (H-142): FR-002 vale aunque db:recrear-admin la marque
      // a la vez. Incluye FR-009/FR-043 (discipulador con discipulados o
      // propuestas), FR-002 y FR-010 — ver el orden y el porqué en
      // `puedeQuitarRol` (shared-types).
      const evaluacion = puedeQuitarRol(
        rol,
        { ...persona, discipuladosActivos, propuestasPendientes, gruposServicioActivos },
        realizadoPorId,
      );
      if (!evaluacion.puede) {
        const { estado, detalle } = RECHAZOS_DE_QUITAR[evaluacion.motivo];
        // FR-043: el 409 nombra cuáles, para que la pantalla enlace a cada uno
        // (contracts/discipulado-api.md, "Cambio al contrato del spec 005").
        const extensiones =
          evaluacion.motivo === 'DISCIPULADOR_TIENE_DISCIPULADOS_ACTIVOS'
            ? { discipulados: evaluacion.discipulados, propuestas: evaluacion.propuestas }
            : evaluacion.motivo === 'LIDER_TIENE_GRUPOS_ACTIVOS'
              ? { grupos: evaluacion.grupos }
              : undefined;
        throw new AppException(evaluacion.motivo, estado, detalle, undefined, extensiones);
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
   *
   * Orden de bloqueo del discipulado (propuestas.service.ts): Solicitud → Grupo
   * → Propuesta → Persona. Otorgar y quitar un rol bloquean SOLO la Persona, el
   * último eslabón, así que no pueden esperarse en cruz con proponer/aceptar/
   * reasignar (D137). Las consultas de discipulados y propuestas de quitarRol
   * son lecturas, sin lock.
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
