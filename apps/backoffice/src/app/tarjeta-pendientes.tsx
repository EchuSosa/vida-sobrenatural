import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { AlertTriangle, CircleCheckBig, Hourglass, Inbox, UserRoundX } from 'lucide-react';
import { apiFetch, DIAS_PROPUESTA_SIN_RESPUESTA, type PendientesAdmin } from '@vida-sobrenatural/shared-types';

/**
 * specs/004, T054g (FR-048): la tarjeta "Pendientes" del Inicio — lo que
 * espera una decisión del Admin mientras no haya notificaciones. Cuatro
 * filas con cantidad, texto e ícono (D81), cada una a su listado filtrado; en
 * cero, "No tenés nada pendiente". Server Component: si la consulta falla, la
 * tarjeta lo dice y el resto del Inicio sigue en pie.
 */
export async function TarjetaPendientes({ apiToken }: { apiToken: string }) {
  const t = await getTranslations('inicio.pendientes');
  let pendientes: PendientesAdmin | null = null;
  try {
    pendientes = await apiFetch<PendientesAdmin>('/discipulado/pendientes-admin', {
      headers: { Authorization: `Bearer ${apiToken}` },
      cache: 'no-store',
    });
  } catch {
    pendientes = null;
  }

  const filas = pendientes
    ? [
        { clave: 'propuestasDeclinadas', icono: Inbox, ...pendientes.propuestasDeclinadas, texto: t('propuestasDeclinadas', { cantidad: pendientes.propuestasDeclinadas.cantidad }) },
        {
          clave: 'propuestasSinRespuesta',
          icono: Hourglass,
          ...pendientes.propuestasSinRespuesta,
          texto: t('propuestasSinRespuesta', { cantidad: pendientes.propuestasSinRespuesta.cantidad, dias: DIAS_PROPUESTA_SIN_RESPUESTA }),
        },
        { clave: 'finalizacionesPropuestas', icono: CircleCheckBig, ...pendientes.finalizacionesPropuestas, texto: t('finalizacionesPropuestas', { cantidad: pendientes.finalizacionesPropuestas.cantidad }) },
        { clave: 'bajasPropuestas', icono: UserRoundX, ...pendientes.bajasPropuestas, texto: t('bajasPropuestas', { cantidad: pendientes.bajasPropuestas.cantidad }) },
        // Lote 0 global: las filas de las specs 006–011 (`PendientesAdmin.extra`).
        ...pendientes.extra.map((linea) => ({ ...linea, icono: Inbox, texto: t(`extra.${linea.clave}`, { cantidad: linea.cantidad }) })),
      ].filter((f) => f.cantidad > 0)
    : [];

  return (
    <section aria-labelledby="pendientes" className="flex max-w-2xl flex-col gap-3 rounded-lg border border-border bg-card p-4 text-card-foreground">
      <h2 id="pendientes" className="text-lg font-semibold">
        {t('titulo')}
      </h2>
      <p className="text-sm text-muted-foreground">{t('descripcion')}</p>
      {!pendientes ? (
        <p role="alert" className="flex items-start gap-2 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {t('error')}
        </p>
      ) : filas.length === 0 ? (
        <p className="flex items-center gap-2 text-sm">
          <CircleCheckBig className="size-4 shrink-0" aria-hidden="true" />
          {t('vacio')}
        </p>
      ) : (
        <ul className="flex flex-col">
          {filas.map(({ clave, icono: Icono, enlace, texto }) => (
            <li key={clave}>
              <Link href={enlace} className="flex min-h-11 items-center gap-2 text-sm underline underline-offset-4">
                <Icono className="size-4 shrink-0" aria-hidden="true" />
                {texto}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
