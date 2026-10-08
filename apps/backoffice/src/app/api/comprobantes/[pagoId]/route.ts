import { auth, tienePermisoSesion } from '../../../../auth';

/**
 * spec 011, T069 (contracts/pagos-api.md) — el Admin ve un comprobante: el
 * backoffice lo pide a la API con su token y reenvía el archivo; nunca hay
 * una URL pública (FR-032). Sin `pagos.verificar`, 404.
 */
export async function GET(request: Request, { params }: { params: Promise<{ pagoId: string }> }) {
  const session = await auth();
  if (!session || !tienePermisoSesion(session, 'pagos.verificar')) return new Response(null, { status: 404 });
  const { pagoId } = await params;
  const api = process.env.API_BASE_URL ?? 'http://localhost:3333';
  const respuesta = await fetch(`${api}/pagos/${encodeURIComponent(pagoId)}/comprobante`, {
    headers: { Authorization: `Bearer ${session.apiToken}` },
    cache: 'no-store',
  });
  if (!respuesta.ok || !respuesta.body) return new Response(null, { status: 404 });
  const descargar = new URL(request.url).searchParams.get('descargar') === '1';
  const disposicion = respuesta.headers.get('content-disposition') ?? 'inline';
  return new Response(respuesta.body, {
    headers: {
      'Content-Type': respuesta.headers.get('content-type') ?? 'application/octet-stream',
      'Content-Disposition': descargar ? disposicion.replace(/^inline/, 'attachment') : disposicion,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
