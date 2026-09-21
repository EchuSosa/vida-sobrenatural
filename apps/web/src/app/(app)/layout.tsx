import { redirect } from 'next/navigation';
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
      <NavAppBar />
      {/* H-66: NavAppTopBarCelular ahora es `fixed top-0` en celular (h-14) —
          pt-14 compensa para que no tape el contenido. */}
      <main id="contenido" className="flex-1 pt-14 pb-20 md:pt-0 md:pb-0">
        {children}
      </main>
    </div>
  );
}
