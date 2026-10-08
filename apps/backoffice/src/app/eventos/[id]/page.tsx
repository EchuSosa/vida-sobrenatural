import { notFound } from 'next/navigation';
import QRCode from 'qrcode';
import { apiFetch, ApiError, type EventoDetalle, type Sede } from '@vida-sobrenatural/shared-types';
import { requerirPermiso, tienePermisoSesion } from '../../../auth';
import { urlDeLaWebApp } from '../../../config/web-app';
import { DatosEvento } from './datos-evento';
import { InscriptosEvento } from './inscriptos-evento';

/**
 * spec 011, T023/T031 — detalle de un Evento. Compone dos secciones con
 * dueños distintos (specs/011 tasks.md § Lotes): `datos-evento.tsx` (lote A:
 * datos, flyer, QR y acciones) e `inscriptos-evento.tsx` (lote D). En un
 * Evento de bautismo, la 010 monta su sección en lugar de la lista de
 * inscriptos (E6). El QR se arma acá, en el servidor, con la URL de la web
 * app de la configuración (D85, research #8).
 */
export default async function EventoDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ creado?: string }>;
}) {
  const session = await requerirPermiso('eventos.ver');
  const { id } = await params;
  const { creado } = await searchParams;
  let evento: EventoDetalle;
  try {
    evento = await apiFetch<EventoDetalle>(`/eventos/${id}`, { headers: { Authorization: `Bearer ${session.apiToken}` } });
  } catch (e) {
    if (e instanceof ApiError && e.code === 'NO_ENCONTRADO') notFound();
    throw e;
  }
  const puedeGestionar = tienePermisoSesion(session, 'eventos.gestionar');
  const sedes = puedeGestionar ? await apiFetch<Sede[]>('/sedes') : [];
  const urlPublica = urlDeLaWebApp(`/eventos/${evento.slug}`);
  const qrDataUrl = evento.requiereInscripcion ? await QRCode.toDataURL(urlPublica, { width: 384, margin: 1 }) : null;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-10 px-4 py-10">
      <DatosEvento
        evento={evento}
        sedes={sedes.map((s) => ({ id: s.id, nombre: s.nombre }))}
        apiToken={session.apiToken}
        puedeGestionar={puedeGestionar}
        urlPublica={urlPublica}
        qrDataUrl={qrDataUrl}
        recienCreado={creado === '1'}
      />
      <InscriptosEvento evento={evento} />
    </div>
  );
}
