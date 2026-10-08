import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { apiFetch, formatearInicioEvento, type InscripcionDePersona, type Pagina } from '@vida-sobrenatural/shared-types';
import { EstadoInscripcionBadge } from '@vida-sobrenatural/ui';

/**
 * spec 011 (FR-048) — la sección "Eventos" del Perfil de Persona: sus
 * Inscripciones a Evento, de la más reciente a la más vieja, con el estado y
 * el pago, y el enlace a cada Evento (ahí se gestiona). Carga y falla sola.
 */
export async function SeccionEventos({ personaId, apiToken }: { personaId: string; apiToken: string }) {
  const [t, locale, inscripciones] = await Promise.all([
    getTranslations('eventos.inscriptos'),
    getLocale(),
    apiFetch<Pagina<InscripcionDePersona>>(`/personas/${encodeURIComponent(personaId)}/inscripciones-evento?take=50`, {
      headers: { Authorization: `Bearer ${apiToken}` },
      cache: 'no-store',
    }),
  ]);
  if (inscripciones.items.length === 0) return <p className="text-sm text-muted-foreground">{t('perfilVacio')}</p>;
  return (
    <ul className="flex flex-col divide-y divide-border">
      {inscripciones.items.map((i) => (
        <li key={i.id} className="flex flex-col gap-1 py-2 sm:flex-row sm:items-center sm:justify-between">
          <span className="flex flex-col">
            <Link href={`/eventos/${i.evento.id}`} className="font-medium underline underline-offset-2 hover:no-underline">
              {i.evento.nombre}
            </Link>
            <span className="text-xs text-muted-foreground">{formatearInicioEvento(i.evento.inicio, null, locale)}</span>
          </span>
          <span className="flex flex-wrap gap-x-3 text-sm">
            <EstadoInscripcionBadge estado={i.estado} texto={i.estado === 'lista_espera' ? t('estados.lista_espera') : t(`estadoFila.${i.estado}`, { posicion: 0 })} />
            {i.estado === 'confirmada' && i.estadoPago !== 'no_aplica' && <EstadoInscripcionBadge estado={i.estadoPago} texto={t(`pago.${i.estadoPago}`)} />}
          </span>
        </li>
      ))}
    </ul>
  );
}
