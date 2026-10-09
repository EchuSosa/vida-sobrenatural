import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import {
  apiFetch,
  type EstadoInscripcionEvento,
  type EventoDetalle,
  type InscripcionEventoResumen,
  type Pagina,
  type ResumenPreguntaEvento,
} from '@vida-sobrenatural/shared-types';
import { InscriptosCliente } from './inscriptos-cliente';
import { ResumenPreguntas } from './resumen-preguntas';

const ESTADOS: EstadoInscripcionEvento[] = ['pendiente', 'confirmada', 'lista_espera', 'rechazada', 'cancelada'];

/**
 * spec 011, lote D (T074, FR-025 a FR-027) — los inscriptos del Evento, por
 * estado (la pestaña vive en la URL: `?estado=`). Por defecto, "Por aprobar"
 * si hay alguna; si no, "Confirmadas". El Pastor ve todo sin acciones (FR-009).
 */
export async function InscriptosEvento({
  evento,
  apiToken,
  estado: estadoParam,
  puedeGestionar,
  puedeVerificar,
}: {
  evento: EventoDetalle;
  apiToken: string;
  estado?: string;
  puedeGestionar: boolean;
  puedeVerificar: boolean;
}) {
  if (!evento.requiereInscripcion) return null;
  const t = await getTranslations('eventos.inscriptos');
  const estado: EstadoInscripcionEvento = ESTADOS.includes(estadoParam as EstadoInscripcionEvento)
    ? (estadoParam as EstadoInscripcionEvento)
    : evento.pendientes > 0
      ? 'pendiente'
      : 'confirmada';
  const pestanas = ESTADOS.filter((e) => e !== 'pendiente' || evento.requiereAprobacion || evento.pendientes > 0).filter(
    (e) => e !== 'lista_espera' || evento.permiteListaEspera || evento.enEspera > 0,
  );
  const auth = { headers: { Authorization: `Bearer ${apiToken}` } };
  const [lista, resumen] = await Promise.all([
    apiFetch<Pagina<InscripcionEventoResumen>>(`/eventos/${evento.id}/inscripciones?estado=${estado}&take=100`, auth),
    // FR-067: el resumen por pregunta; si falla, la lista se muestra igual con el error en su lugar.
    evento.preguntas.length > 0
      ? apiFetch<ResumenPreguntaEvento[]>(`/eventos/${evento.id}/preguntas/resumen`, auth).catch(() => null)
      : Promise.resolve([] as ResumenPreguntaEvento[]),
  ]);
  const conteo: Partial<Record<EstadoInscripcionEvento, number>> = {
    pendiente: evento.pendientes,
    confirmada: evento.ocupados - evento.pendientes,
    lista_espera: evento.enEspera,
  };

  return (
    <section id="inscriptos" aria-labelledby="titulo-inscriptos" className="flex flex-col gap-4 border-t border-border pt-8">
      <h2 id="titulo-inscriptos" className="text-xl font-semibold">
        {t('titulo')}
      </h2>
      <ResumenPreguntas resumen={resumen} />
      <nav aria-label={t('pestanas')} className="flex flex-wrap gap-1 border-b border-border">
        {pestanas.map((e) => (
          <Link
            key={e}
            href={`/eventos/${evento.id}?estado=${e}#inscriptos`}
            aria-current={e === estado ? 'page' : undefined}
            className="-mb-px border-b-2 border-transparent px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground aria-[current=page]:border-primary aria-[current=page]:text-foreground"
          >
            {t(`estados.${e}`)}
            {conteo[e] !== undefined && ` (${conteo[e]})`}
          </Link>
        ))}
      </nav>
      <InscriptosCliente
        key={estado}
        evento={evento}
        estado={estado}
        inscripciones={lista.items}
        apiToken={apiToken}
        puedeGestionar={puedeGestionar}
        puedeVerificar={puedeVerificar}
      />
    </section>
  );
}
