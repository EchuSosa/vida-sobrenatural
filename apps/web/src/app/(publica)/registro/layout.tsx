import { redirect } from 'next/navigation';
import { auth } from '../../../auth';

/**
 * spec 007 (T024): sin sesión, el registro lleva a la pantalla de ingreso
 * (Google o código, un solo lugar). Va en el layout y no en `page.tsx`: el
 * `loading.tsx` de esta carpeta abre un límite de Suspense alrededor de la
 * página, y un `redirect()` adentro ya no es un 307 sino una página 200 con
 * un `meta refresh` (que además corta los pedidos en curso de la anterior).
 * Cubre también `/registro/listo` sin sesión.
 */
export default async function RegistroLayout({ children }: { children: React.ReactNode }) {
  if (!(await auth())) redirect('/ingresar');
  return children;
}
