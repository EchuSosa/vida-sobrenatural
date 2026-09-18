'use client';

import { signOut } from 'next-auth/react';
import { ConfirmDestructiveDialog, Button } from '@vida-sobrenatural/ui';

/**
 * H-11 (actualización 2026-09-18): acción de cerrar sesión, ausente hasta
 * ahora. Diálogo de confirmación con verbo concreto (D94) y vuelta al
 * Inicio público con un aviso breve (D102) — ver AvisoPorQuery en "/".
 */
export function CerrarSesionBoton() {
  return (
    <ConfirmDestructiveDialog
      trigger={
        <Button variant="outline" size="sm">
          Cerrar sesión
        </Button>
      }
      titulo="¿Cerrar sesión?"
      descripcion="Vas a tener que volver a autorizar el acceso con tu cuenta de Google para entrar de nuevo."
      textoConfirmar="Sí, cerrar sesión"
      textoCancelar="Volver"
      onConfirmar={() => signOut({ callbackUrl: '/?sesion=cerrada' })}
    />
  );
}
