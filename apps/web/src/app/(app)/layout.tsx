import { redirect } from 'next/navigation';
import { apiFetch } from '@vida-sobrenatural/shared-types';
import { auth } from '../../auth';
import { NavAppBar } from '../../components/nav-app-bar';
import { NavAppTopBarCelular } from '../../components/nav-app-mas';
import { SincronizarTema } from '../../components/sincronizar-tema';

export const metadata = {
  robots: { index: false, follow: false },
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) {
    redirect('/registro');
  }
  // FR-030 de la 001 (H-R1, revisión manual de la 004): con sesión no alcanza —
  // quien entró con Google y no completó el registro no tiene Persona, y veía
  // toda la app privada. Un menor pendiente_tutor va a su pantalla de espera.
  if (session.user.estado === 'pendiente_tutor') {
    redirect('/pendiente-tutor');
  }
  if (!session.user.personaId || session.user.estado !== 'activa') {
    redirect('/registro');
  }

  // spec 012, T022 (FR-005): el contador de avisos sin leer, sin caché. Si
  // falla, la barra se muestra sin número (nunca rompe la app por esto).
  const sinLeer = await apiFetch<{ cantidad: number }>('/avisos/sin-leer', {
    headers: { Authorization: `Bearer ${session.apiToken}` },
    cache: 'no-store',
  })
    .then((r) => r.cantidad)
    .catch(() => null);

  // H-25/H-28 (revisión manual, actualización 2026-09-20): este contenedor
  // tenía `md:flex-row`, pero NavAppBar ya es responsive por sí solo (barra
  // inferior fija en celular, `md:sticky md:top-0` — barra superior en
  // escritorio). Con `md:flex-row`, NavAppBar (sin `w-full`) quedaba como un
  // ítem angosto de un flex-row junto al <main>, en vez de ocupar el ancho
  // completo arriba — el layout roto de H-25, y la causa de que Perfil (ya
  // presente en NAV_APP) fuera inalcanzable en escritorio (H-28).
  return (
    <div className="flex min-h-screen flex-col">
      <SincronizarTema />
      {/* H-37: barra superior delgada solo en celular (logo + "Más") — en
          escritorio esas secciones ya viven dentro de NavAppBar. */}
      <NavAppTopBarCelular />
      <NavAppBar sinLeer={sinLeer} />
      {/* H-66: NavAppTopBarCelular ahora es `fixed top-0` en celular (h-14) —
          pt-14 compensa para que no tape el contenido. */}
      <main id="contenido" className="flex-1 pt-14 pb-20 md:pt-0 md:pb-0">
        {children}
      </main>
    </div>
  );
}
