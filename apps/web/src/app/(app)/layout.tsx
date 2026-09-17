import { redirect } from 'next/navigation';
import { auth } from '../../auth';
import { NavAppBar } from '../../components/nav-app-bar';
import { SincronizarTema } from '../../components/sincronizar-tema';

export const metadata = {
  robots: { index: false, follow: false },
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) {
    redirect('/registro');
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <SincronizarTema />
      <NavAppBar />
      <main id="contenido" className="flex-1 pb-20 md:pb-0">
        {children}
      </main>
    </div>
  );
}
