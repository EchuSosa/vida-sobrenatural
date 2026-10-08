'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * spec 013 (T064, FR-045): el enlace a "Contanos qué te parece" con la
 * pantalla actual en `?desde=` (solo el path, sin query: la query puede tener
 * datos de la Persona), para guardarla como página de origen y volver.
 */
export function EnlaceContanos({ children, className }: { children: React.ReactNode; className?: string }) {
  const pathname = usePathname();
  const desde = pathname && pathname !== '/contanos' ? `?desde=${encodeURIComponent(pathname)}` : '';
  return (
    <Link href={`/contanos${desde}`} className={className}>
      {children}
    </Link>
  );
}
