'use client';

import { useState, type ReactElement, type ReactNode } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './ui/alert-dialog';
import { Button } from './ui/button';
import { MensajeErrorCampo, ResumenErrores } from './form-errors';
import { useEnvio } from '../hooks/use-envio';
import { useValidacionCampos } from '../hooks/use-validacion-campos';
import { cn } from '../lib/utils';

export interface DialogoTextoOpcionalProps {
  /** El botón que lo abre. */
  trigger: ReactElement;
  titulo: string;
  descripcion?: string;
  /** Lo que va arriba del texto (ej. un selector de etapa). */
  children?: ReactNode;
  /** El `name` del campo: arma `campo-<campo>` para el resumen de errores (H-50). */
  campo: string;
  etiqueta: string;
  ayuda?: string;
  max: number;
  contador: (cantidad: number, maximo: number) => string;
  mensajeDemasiadoLargo: string;
  tituloResumen: string;
  textoEnviar: string;
  textoVolver: string;
  /** `neutro` para lo reversible (D151). */
  tono?: 'neutro' | 'destructivo';
  /**
   * Recibe el texto sin espacios de más (`null` si quedó vacío). Si devuelve
   * `{ errorCampo }`, lo muestra en el campo y no cierra; si no, cierra.
   */
  onEnviar: (texto: string | null) => Promise<{ errorCampo?: string } | void>;
}

/**
 * spec 006 (FR-009, FR-013, FR-014): un paso de confirmación con un texto
 * OPCIONAL y su límite — "Ya lo hice" (comentario), "No confirmar" (motivo) y
 * "Registrar una etapa hecha" (nota). El largo se valida antes de enviar, con
 * el error debajo del campo y en el resumen con foco (H-50); el envío queda
 * protegido de la reentrada (H-57). Una sola pieza para las dos apps
 * (Principio XI).
 */
export function DialogoTextoOpcional({
  trigger,
  titulo,
  descripcion,
  children,
  campo,
  etiqueta,
  ayuda,
  max,
  contador,
  mensajeDemasiadoLargo,
  tituloResumen,
  textoEnviar,
  textoVolver,
  tono = 'neutro',
  onEnviar,
}: DialogoTextoOpcionalProps) {
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState('');
  const validacion = useValidacionCampos();
  const idCampo = `campo-${campo}`;
  const largo = texto.trim().length;

  function cambiarAbierto(abrir: boolean) {
    setAbierto(abrir);
    if (!abrir) {
      setTexto('');
      validacion.reset();
    }
  }

  const { enviando, ejecutar } = useEnvio(async () => {
    if (largo > max) {
      validacion.reemplazar({ [campo]: mensajeDemasiadoLargo });
      return;
    }
    const resultado = await onEnviar(texto.trim() === '' ? null : texto.trim());
    if (resultado?.errorCampo) {
      validacion.reemplazar({ [campo]: resultado.errorCampo });
      return;
    }
    cambiarAbierto(false);
  });

  return (
    <AlertDialog open={abierto} onOpenChange={cambiarAbierto}>
      <AlertDialogTrigger render={trigger} />
      <AlertDialogContent data-tono={tono}>
        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void ejecutar();
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>{titulo}</AlertDialogTitle>
            {descripcion && <AlertDialogDescription>{descripcion}</AlertDialogDescription>}
          </AlertDialogHeader>
          <ResumenErrores errores={validacion.resumen} foco={validacion.foco} titulo={tituloResumen} />
          {children}
          <div className="flex flex-col gap-2">
            <label htmlFor={idCampo} className="text-base font-medium">
              {etiqueta}
            </label>
            {ayuda && (
              <p id={`${idCampo}-ayuda`} className="text-base text-muted-foreground">
                {ayuda}
              </p>
            )}
            <textarea
              id={idCampo}
              name={campo}
              value={texto}
              rows={3}
              onChange={(e) => {
                setTexto(e.target.value);
                if (e.target.value.trim().length <= max) validacion.limpiar(campo);
              }}
              aria-invalid={validacion.mensajes[campo] ? true : undefined}
              aria-describedby={cn(ayuda && `${idCampo}-ayuda`, `${idCampo}-contador`, validacion.mensajes[campo] && `${idCampo}-error`)}
              disabled={enviando}
              className="min-h-24 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30"
            />
            <p id={`${idCampo}-contador`} className={cn('text-sm text-muted-foreground', largo > max && 'font-medium text-foreground')}>
              {contador(largo, max)}
            </p>
            <MensajeErrorCampo id={`${idCampo}-error`} mensaje={validacion.mensajes[campo]} />
          </div>
          <AlertDialogFooter>
            <Button type="button" variant="ghost" size="xl" className="text-base" onClick={() => cambiarAbierto(false)}>
              {textoVolver}
            </Button>
            <Button type="submit" size="xl" className="text-base" loading={enviando}>
              {textoEnviar}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
