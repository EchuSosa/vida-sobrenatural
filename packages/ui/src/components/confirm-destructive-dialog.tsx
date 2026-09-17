'use client';

import type { ReactNode } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './ui/alert-dialog';

export interface ConfirmDestructiveDialogProps {
  /** Elemento que abre el diálogo (un botón, normalmente). */
  trigger: ReactNode;
  /** Título — debe nombrar explícitamente qué se va a afectar (ej. "¿Cancelar la inscripción de Ana García?"). */
  titulo: string;
  descripcion?: string;
  textoConfirmar: string;
  textoCancelar?: string;
  onConfirmar: () => void;
}

/**
 * Confirmación reutilizable para acciones destructivas — Historia 3, FR-019.
 * El "deshacer" (cuando es técnicamente posible) se resuelve del lado de
 * quien la usa, ej. mostrando un toast con acción "Deshacer" tras confirmar.
 */
export function ConfirmDestructiveDialog({
  trigger,
  titulo,
  descripcion,
  textoConfirmar,
  textoCancelar = 'Cancelar',
  onConfirmar,
}: ConfirmDestructiveDialogProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger render={trigger as React.ReactElement} />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{titulo}</AlertDialogTitle>
          {descripcion && <AlertDialogDescription>{descripcion}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{textoCancelar}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirmar}>{textoConfirmar}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
