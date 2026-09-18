import { redirect } from 'next/navigation';
import { auth } from '../../../../auth';
import { GuardaRegistroReciente } from '../../../../components/guarda-registro-reciente';
import { ContenidoRegistroListo } from './contenido';

export const metadata = {
  title: 'Registro completo — Vida Sobrenatural',
};

/**
 * H-15 (actualización 2026-09-18): esta pantalla ya no es estática — exige
 * sesión con estado "activa" (si no, no hay nada que confirmar: redirige a
 * /registro) y, además, la guarda de "recién completado" de
 * GuardaRegistroReciente (sessionStorage, seteado por registro/page.tsx
 * justo antes de navegar acá) — sin ese flag, alguien que entra directo por
 * URL bastante tiempo después vería una confirmación falsa.
 */
export default async function RegistroListoPage() {
  const session = await auth();
  if (!session || session.user.estado !== 'activa') {
    redirect('/registro');
  }

  return (
    <GuardaRegistroReciente>
      <ContenidoRegistroListo />
    </GuardaRegistroReciente>
  );
}
