'use client';

import { useState, type ReactNode } from 'react';
import { MOTIVO_MAX } from '@vida-sobrenatural/shared-types';
import {
  Button,
  MensajeErrorCampo,
  ResumenErrores,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  useEnvio,
  useValidacionCampos,
} from '@vida-sobrenatural/ui';

export interface TextosPanelMotivo {
  titulo: string;
  descripcion: string;
  etiqueta: string;
  ayuda: string;
  confirmar: string;
  enviando: string;
  volver: string;
  cerrarPanel: string;
  resumen: string;
  /** Mensaje de campo para un motivo de más de `MOTIVO_MAX` (MOTIVO_DEMASIADO_LARGO). */
  demasiadoLargo: string;
}

/**
 * specs/004, lote B: el panel con un motivo opcional que usan declinar una
 * propuesta, pedir una baja y rechazar una finalización o una baja (FR-037,
 * FR-019a, FR-042). Una sola pieza para las cuatro (Principio XI). Valida el
 * largo al salir del campo y al enviar (H-72); si la API igual devuelve un
 * error de campo, `onConfirmar` lo devuelve y se muestra debajo del campo y
 * en el resumen (H-50). El guard de reentrada va en el envío (H-57).
 */
export function PanelMotivo({
  abierto,
  onCerrar,
  textos,
  onConfirmar,
  destructivo = false,
  children,
}: {
  abierto: boolean;
  onCerrar: () => void;
  textos: TextosPanelMotivo;
  /** Devuelve los errores de campo de la API (si los hubo) o null si salió bien. */
  onConfirmar: (motivo: string) => Promise<Record<string, string> | null>;
  destructivo?: boolean;
  children?: ReactNode;
}) {
  const [motivo, setMotivo] = useState('');
  const validacion = useValidacionCampos();
  const reglaLargo = { esValido: (v: string) => v.trim().length <= MOTIVO_MAX, mensaje: textos.demasiadoLargo };

  const { enviando, ejecutar } = useEnvio(async () => {
    if (!reglaLargo.esValido(motivo)) {
      validacion.reemplazar({ motivo: textos.demasiadoLargo });
      return;
    }
    const errores = await onConfirmar(motivo.trim());
    if (errores) validacion.reemplazar(errores);
  });

  return (
    <Sheet open={abierto} onOpenChange={(a) => !a && onCerrar()}>
      <SheetContent side="bottom" etiquetaCerrar={textos.cerrarPanel} className="mx-auto max-w-lg">
        <SheetHeader>
          <SheetTitle>{textos.titulo}</SheetTitle>
          <SheetDescription>{textos.descripcion}</SheetDescription>
        </SheetHeader>
        <form
          className="flex flex-col gap-4 px-4"
          onSubmit={(e) => {
            e.preventDefault();
            void ejecutar();
          }}
        >
          {children}
          <ResumenErrores errores={validacion.resumen} foco={validacion.foco} titulo={textos.resumen} />
          <div className="flex flex-col gap-1">
            <label htmlFor="campo-motivo" className="text-sm font-medium">
              {textos.etiqueta}
            </label>
            <p id="campo-motivo-ayuda" className="text-sm text-muted-foreground">
              {textos.ayuda}
            </p>
            <textarea
              id="campo-motivo"
              rows={4}
              value={motivo}
              onChange={(e) => {
                setMotivo(e.target.value);
                validacion.limpiar('motivo');
              }}
              onBlur={() => validacion.revalidar('motivo', motivo, reglaLargo)}
              aria-invalid={Boolean(validacion.mensajes.motivo)}
              aria-describedby={validacion.mensajes.motivo ? 'campo-motivo-ayuda campo-motivo-error' : 'campo-motivo-ayuda'}
              className="min-h-24 rounded-md border border-input bg-transparent px-3 py-2 text-base aria-invalid:border-destructive md:text-sm dark:bg-input/30"
            />
            <MensajeErrorCampo id="campo-motivo-error" mensaje={validacion.mensajes.motivo} />
          </div>
          <SheetFooter className="flex-col gap-2 px-0 sm:flex-row-reverse sm:justify-start">
            <Button type="submit" variant={destructivo ? 'destructive' : 'default'} loading={enviando} loadingText={textos.enviando} size="xl" className="w-full sm:w-auto">
              {textos.confirmar}
            </Button>
            <Button type="button" variant="outline" onClick={onCerrar} size="xl" className="w-full sm:w-auto">
              {textos.volver}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
