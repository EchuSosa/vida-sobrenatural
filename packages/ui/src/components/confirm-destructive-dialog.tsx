'use client';

import { useState, type ReactNode } from 'react';
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
 *
 * H-51/H-52 (revisión manual ronda 4): `AlertDialogAction` es un `Button`
 * liso, sin cierre automático de Base UI — antes este diálogo quedaba
 * "abierto" en el DOM después de confirmar (nadie lo notaba porque
 * `onConfirmar` solía navegar o desmontar la fila). En Sedes, `onConfirmar`
 * puede responder con un error que abre OTRO diálogo (SEDE_UNICA_ACTIVA) sin
 * desmontar nada — el overlay de este diálogo, todavía "abierto", quedaba
 * tapando al segundo. Mismo problema de fondo que H-47/H-11: dos overlays
 * de Base UI superpuestos. Se controla el `open` acá y se cierra ANTES de
 * llamar a `onConfirmar`, para que quien lo usa pueda abrir lo que necesite
 * después sin pisarse con este.
 */
export function ConfirmDestructiveDialog({
  trigger,
  titulo,
  descripcion,
  textoConfirmar,
  textoCancelar = 'Cancelar',
  onConfirmar,
}: ConfirmDestructiveDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={trigger as React.ReactElement} />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{titulo}</AlertDialogTitle>
          {descripcion && <AlertDialogDescription>{descripcion}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{textoCancelar}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              setOpen(false);
              onConfirmar();
            }}
          >
            {textoConfirmar}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
