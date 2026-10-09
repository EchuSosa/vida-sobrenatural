import { auth } from '../../../../../auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3333';

/**
 * spec 008, FR-024 (research #5): un archivo de material de Vida de Servicio.
 * Los archivos son privados: el navegador no puede mandarle el token a la
 * API desde un `<a>` ni un `<img>`, así que esta ruta lo pide con la sesión y
 * lo devuelve tal cual (la API decide en cada pedido quién lo puede ver:
 * inscripta con derecho a esa semana, Líder vigente o Admin/Pastor). Sin
 * sesión o sin permiso, 404 — no se confirma que exista. La usan el Admin y el Pastor (backoffice); en la web, la Persona
 * y el Líder.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ archivoId: string }> }) {
  const { archivoId } = await params;
  const session = await auth();
  if (!session?.apiToken) return new Response(null, { status: 404 });
  const respuesta = await fetch(`${API_BASE_URL}/vida-de-servicio/archivos/${encodeURIComponent(archivoId)}`, {
    headers: { Authorization: `Bearer ${session.apiToken}` },
    cache: 'no-store',
  });
  if (!respuesta.ok || !respuesta.body) return new Response(null, { status: respuesta.status === 404 ? 404 : 502 });
  const headers = new Headers({ 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' });
  for (const h of ['Content-Type', 'Content-Disposition', 'Content-Length']) {
    const valor = respuesta.headers.get(h);
    if (valor) headers.set(h, valor);
  }
  return new Response(respuesta.body, { status: 200, headers });
}
