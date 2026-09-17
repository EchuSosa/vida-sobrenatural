import { NavPublicaHeader } from '../../components/nav-publica-header';
import { FooterPublico } from '../../components/footer-publico';

export default function PublicaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <NavPublicaHeader />
      <main id="contenido" className="flex-1">
        {children}
      </main>
      <FooterPublico />
    </div>
  );
}
