import { getTranslations } from 'next-intl/server';
import { apiFetch, type SeccionBautismoEventoDatos } from '@vida-sobrenatural/shared-types';
import { SeccionBautismoEventoCliente } from './seccion-bautismo-evento-cliente';

export const ESPERANDO_POR_PAGINA = 20;

/**
 * spec 010, T036 y T058 (Historias 3 y 7; FR-012 a FR-015, FR-027, FR-033):
 * la sección "Bautismo" del detalle de un Evento de bautismo — la monta
 * `app/eventos/[id]/page.tsx` en lugar de la lista genérica de inscriptos
 * (E6). Dos bloques: "Personas a bautizar" (con "Quitar") y "Esperando
 * fecha" (selección múltiple, paginada en la URL con `?esperando=`). Pasada
 * la fecha, "Confirmar bautismos". El Pastor la ve sin acciones (FR-011).
 */
export async function SeccionBautismoEvento({
  eventoId,
  apiToken,
  puedeGestionar,
  paginaEsperando,
}: {
  eventoId: string;
  apiToken: string;
  puedeGestionar: boolean;
  paginaEsperando: number;
}) {
  const t = await getTranslations('eventos.bautismo');
  const datos = await apiFetch<SeccionBautismoEventoDatos>(
    `/bautismo/eventos/${encodeURIComponent(eventoId)}?skipEsperando=${(paginaEsperando - 1) * ESPERANDO_POR_PAGINA}&takeEsperando=${ESPERANDO_POR_PAGINA}`,
    { headers: { Authorization: `Bearer ${apiToken}` }, cache: 'no-store' },
  );
  return (
    <section id="bautismo" aria-labelledby="titulo-bautismo" className="flex flex-col gap-6 border-t border-border pt-8">
      <div className="flex flex-col gap-1">
        <h2 id="titulo-bautismo" className="text-xl font-semibold">
          {t('titulo')}
        </h2>
        <p className="text-sm text-muted-foreground">{t('descripcion')}</p>
      </div>
      <SeccionBautismoEventoCliente
        datos={datos}
        apiToken={apiToken}
        puedeGestionar={puedeGestionar}
        paginaEsperando={paginaEsperando}
        totalPaginasEsperando={Math.max(1, Math.ceil(datos.esperandoFecha.total / ESPERANDO_POR_PAGINA))}
      />
    </section>
  );
}
