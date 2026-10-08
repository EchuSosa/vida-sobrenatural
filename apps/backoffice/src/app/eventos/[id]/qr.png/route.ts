import QRCode from 'qrcode';
import { apiFetch, ApiError, type EventoDetalle } from '@vida-sobrenatural/shared-types';
import { auth, tienePermisoSesion } from '../../../../auth';
import { urlDeLaWebApp } from '../../../../config/web-app';

/**
 * spec 011, T031 (contracts/eventos-api.md § QR) — descarga del QR como PNG
 * de 1024 px, para proyectar o imprimir (FR-013, D56). Exige `eventos.ver`;
 * sin él, 404 (no revela que existe). Se genera al vuelo: el slug no cambia,
 * así que el QR siempre es el mismo (research #8).
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || !tienePermisoSesion(session, 'eventos.ver')) return new Response(null, { status: 404 });
  const { id } = await params;
  let evento: EventoDetalle;
  try {
    evento = await apiFetch<EventoDetalle>(`/eventos/${id}`, { headers: { Authorization: `Bearer ${session.apiToken}` } });
  } catch (e) {
    if (e instanceof ApiError && e.code === 'NO_ENCONTRADO') return new Response(null, { status: 404 });
    throw e;
  }
  const png = await QRCode.toBuffer(urlDeLaWebApp(`/eventos/${evento.slug}`), { type: 'png', width: 1024, margin: 2 });
  return new Response(new Uint8Array(png), {
    headers: {
      'Content-Type': 'image/png',
      'Content-Disposition': `attachment; filename="qr-${evento.slug}.png"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
