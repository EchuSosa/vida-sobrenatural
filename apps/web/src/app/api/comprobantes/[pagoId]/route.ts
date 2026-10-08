import { auth } from '../../../../auth';

/**
 * spec 011, T064 (contracts/pagos-api.md) — la Persona ve su comprobante: la
 * web lo pide a la API con el token de la sesión y reenvía el archivo. Nunca
 * hay una URL pública del comprobante (FR-032). Sin sesión o ajeno, 404.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ pagoId: string }> }) {
  const session = await auth();
  if (!session?.apiToken) return new Response(null, { status: 404 });
  const { pagoId } = await params;
  const api = process.env.API_BASE_URL ?? 'http://localhost:3333';
  const respuesta = await fetch(`${api}/pagos/${encodeURIComponent(pagoId)}/comprobante`, {
    headers: { Authorization: `Bearer ${session.apiToken}` },
    cache: 'no-store',
  });
  if (!respuesta.ok || !respuesta.body) return new Response(null, { status: 404 });
  return new Response(respuesta.body, {
    headers: {
      'Content-Type': respuesta.headers.get('content-type') ?? 'application/octet-stream',
      'Content-Disposition': respuesta.headers.get('content-disposition') ?? 'inline',
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
