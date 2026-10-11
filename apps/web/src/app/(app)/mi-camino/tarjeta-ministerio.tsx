import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Hourglass, ListChecks } from 'lucide-react';
import { apiFetch, type EstadoMiMinisterio, type ResumenMiEleccion } from '@vida-sobrenatural/shared-types';
import { AvisoEstado, ButtonLink } from '@vida-sobrenatural/ui';
import type { PropsAccionesEtapa } from './acciones-etapa';
import { CardMinisterioCliente } from './card-ministerio';
import { textoOpcion } from '../../../components/eleccion/selector-ministerios';

/**
 * spec 009, T035 (FR-011 a FR-014) — lo propio de la card de Ministerio en Mi
 * camino (ver `acciones-etapa.ts`): pide `GET /ministerios/me` y muestra el
 * estado de la Persona con sus acciones. spec 015 (D239): arriba, la elección
 * de ministerio de su edición de Vida de Servicio, si está abierta o ya eligió.
 * Si la API falla, lo atrapa el `error.tsx` de Mi camino, como el resto.
 */
export async function AccionesMinisterio({ apiToken }: PropsAccionesEtapa) {
  const headers = { Authorization: `Bearer ${apiToken}` };
  const [estado, eleccion] = await Promise.all([
    apiFetch<EstadoMiMinisterio>('/ministerios/me', { headers, cache: 'no-store' }),
    apiFetch<ResumenMiEleccion>('/elecciones-ministerio/me/resumen', { headers, cache: 'no-store' }),
  ]);
  return (
    <div className="flex flex-col gap-4">
      {eleccion && <ResumenEleccion resumen={eleccion} />}
      <CardMinisterioCliente estadoInicial={estado} />
    </div>
  );
}

async function ResumenEleccion({ resumen }: { resumen: NonNullable<ResumenMiEleccion> }) {
  const t = await getTranslations('eleccion');
  if (resumen.estado === 'puede_elegir') {
    return (
      <div className="flex flex-col gap-3 rounded-md border border-primary p-3">
        <AvisoEstado icono={<ListChecks className="text-primary" />} titulo={t('cardPuedeElegirTitulo')}>
          {t('cardPuedeElegirTexto')}
        </AvisoEstado>
        <ButtonLink render={<Link href="/mi-camino/ministerios/elegir" />} size="xl" className="w-full text-base sm:w-fit">
          {t('cardElegir')}
        </ButtonLink>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3 rounded-md border border-border p-3">
      <AvisoEstado
        icono={<Hourglass className="text-primary" />}
        titulo={t('cardElegisteTitulo', { opciones: resumen.opciones.map(textoOpcion).join(' / ') })}
      >
        {resumen.estado === 'charla_hecha' ? t('charlaHechaTexto') : t('cardFaltaCharla')}
      </AvisoEstado>
      {resumen.editable && (
        <ButtonLink render={<Link href="/mi-camino/ministerios/elegir" />} variant="outline" size="xl" className="w-full text-base sm:w-fit">
          {t('cardCambiar')}
        </ButtonLink>
      )}
    </div>
  );
}
