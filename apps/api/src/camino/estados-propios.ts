import { estadoCardBautismo, type HechosCamino } from '@vida-sobrenatural/shared-types';
import type { Prisma } from '../generated/prisma/client.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { hechosDe as hechosDeBautismo } from '../bautismo/estado-bautismo.js';

type Db = PrismaService | Prisma.TransactionClient;
type Propios = NonNullable<HechosCamino['propios']>;

/**
 * El estado PROPIO de cada etapa que lo informa, para el encabezado de su card
 * (`EstadoPropioEtapa`): lo que la etapa sabe de sí misma y la 006 no, para
 * que el encabezado nunca contradiga lo de abajo. En un archivo aparte de
 * `consultas.ts` porque usa las consultas de Bautismo, que a su vez usan
 * `consultas.ts`.
 *
 * - Ministerio (Ajustes 2, PR #18 Pregunta 5): una Postulación pendiente.
 * - Vida de Servicio: inscripta en una edición en curso, o un pedido pendiente
 *   (el mismo orden que `estadoDeVidaDeServicio`: en curso antes que pendiente).
 * - Bautismo: lo mismo que la card de abajo (`estadoCardBautismo`, `GET
 *   /bautismo/me`): en revisión, aceptado (con la fecha del Evento si la
 *   tiene) o habilitado por el Admin sin Vida Nueva (D147).
 */
export async function estadosPropios(db: Db, personaId: string): Promise<Propios> {
  const [postulacion, inscripcionVs, pedidoVs, bautismo] = await Promise.all([
    db.postulacion.findFirst({ where: { personaId, estado: 'pendiente' }, select: { createdAt: true } }),
    db.inscripcion.findFirst({
      where: { personaId, estado: 'activa', grupo: { estado: 'en_curso', curso: { categoria: 'vida_de_servicio' } } },
      select: { id: true },
    }),
    db.solicitudVidaServicio.findFirst({ where: { personaId, estado: 'pendiente' }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } }),
    hechosDeBautismo(db, personaId),
  ]);

  const propios: Propios = {};
  if (postulacion) propios.ministerio = { estado: 'solicitud_en_revision', desde: postulacion.createdAt.toISOString() };

  if (inscripcionVs) propios.vida_de_servicio = { estado: 'en_curso' };
  else if (pedidoVs) propios.vida_de_servicio = { estado: 'solicitud_en_revision', desde: pedidoVs.createdAt.toISOString() };

  if (bautismo) {
    const card = estadoCardBautismo(bautismo);
    switch (card.estado) {
      case 'en_revision':
        propios.bautismo = { estado: 'solicitud_en_revision', desde: card.desde };
        break;
      case 'esperando_fecha':
        propios.bautismo = { estado: 'aceptada', fecha: null, yaPaso: false };
        break;
      case 'con_fecha':
      case 'fecha_pasada_sin_confirmar':
        propios.bautismo = { estado: 'aceptada', fecha: card.evento.inicio, yaPaso: card.estado === 'fecha_pasada_sin_confirmar' };
        break;
      case 'puede_pedir':
        if (bautismo.habilitada) propios.bautismo = { estado: 'habilitada' };
        break;
      default:
        break;
    }
  }
  return propios;
}
