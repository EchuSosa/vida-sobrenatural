'use client';

import { signOut } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { LogOut } from 'lucide-react';
import { ConfirmDestructiveDialog, Button, useEnvio } from '@vida-sobrenatural/ui';

/**
 * H-11 (actualización 2026-09-18): acción de cerrar sesión, ausente hasta
 * ahora. Diálogo de confirmación con verbo concreto (D94) y vuelta al
 * Inicio público con un aviso breve (D102) — ver AvisoPorQuery en "/".
 * H-57: el guard va también en el envío (ConfirmDestructiveDialog ya cierra
 * el diálogo al confirmar, pero signOut() sigue siendo un envío real).
 */
export function CerrarSesionBoton() {
  const t = useTranslations('nav');
  const { ejecutar: cerrarSesion } = useEnvio(async () => {
    await signOut({ callbackUrl: '/?sesion=cerrada' });
  });

  return (
    <ConfirmDestructiveDialog
      trigger={
        // ajustes-ux #52: con ícono y verbo, a todo el ancho en celular. No
        // rojo: cerrar sesión se deshace volviendo a entrar (D151).
        <Button variant="outline" size="sm" className="w-full sm:w-auto sm:self-start">
          <LogOut aria-hidden />
          {t('cerrarSesion')}
        </Button>
      }
      titulo={t('cerrarSesionTitulo')}
      descripcion={t('cerrarSesionDescripcion')}
      textoConfirmar={t('cerrarSesionConfirmar')}
      textoCancelar={t('cerrarSesionVolver')}
      // D151: cerrar sesión es reversible (se vuelve a entrar).
      tono="neutro"
      onConfirmar={cerrarSesion}
    />
  );
}
