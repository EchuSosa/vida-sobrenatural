'use client';

import { useState, type ReactElement } from 'react';
import { useTranslations } from 'next-intl';
import { confirmaNombre } from '@vida-sobrenatural/shared-types';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
  MensajeErrorCampo,
  useEnvio,
} from '@vida-sobrenatural/ui';

/**
 * spec 009 (FR-028, D38, D151, SC-007): inactivar o reactivar un Ministerio o
 * un área. Es reversible: confirmación neutra. Con gente sirviendo o
 * postulaciones pendientes, el diálogo dice cuántos y pide el nombre exacto
 * (la API lo exige igual).
 */
export function DialogoCambiarActivo({
  trigger,
  nombre,
  activo,
  miembros,
  pendientes,
  onConfirmar,
}: {
  trigger: ReactElement;
  nombre: string;
  activo: boolean;
  miembros: number;
  pendientes: number;
  /** Devuelve `false` si no se pudo (el diálogo queda abierto). */
  onConfirmar: (confirmacionNombre?: string) => Promise<boolean>;
}) {
  const t = useTranslations('ministerios');
  const [abierto, setAbierto] = useState(false);
  const [escrito, setEscrito] = useState('');
  const [error, setError] = useState<string | undefined>();
  const reforzada = activo && (miembros > 0 || pendientes > 0);

  const { enviando, ejecutar } = useEnvio(async () => {
    if (reforzada && !confirmaNombre(escrito, nombre)) {
      setError(t('confirmacionNoCoincide'));
      return;
    }
    if (await onConfirmar(reforzada ? escrito : undefined)) setAbierto(false);
  });

  return (
    <AlertDialog
      open={abierto}
      onOpenChange={(v) => {
        setAbierto(v);
        setEscrito('');
        setError(undefined);
      }}
    >
      <AlertDialogTrigger render={trigger} />
      <AlertDialogContent data-tono="neutro">
        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void ejecutar();
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>{activo ? t('inactivarTitulo', { nombre }) : t('reactivarTitulo', { nombre })}</AlertDialogTitle>
            <AlertDialogDescription>{activo ? t('inactivarDescripcion') : t('reactivarDescripcion')}</AlertDialogDescription>
          </AlertDialogHeader>
          {reforzada && (
            <div className="flex flex-col gap-2">
              <p className="text-sm">{t('inactivarConGente', { miembros, pendientes, nombre })}</p>
              <label htmlFor="campo-confirmacionNombre" className="font-medium">
                {t('confirmacionEtiqueta')}
              </label>
              <input
                id="campo-confirmacionNombre"
                value={escrito}
                autoComplete="off"
                onChange={(e) => {
                  setEscrito(e.target.value);
                  setError(undefined);
                }}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? 'campo-confirmacionNombre-error' : undefined}
                className="h-10 w-full rounded-lg border border-input bg-transparent px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive dark:bg-input/30"
              />
              <MensajeErrorCampo id="campo-confirmacionNombre-error" mensaje={error} />
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancelar')}</AlertDialogCancel>
            <Button type="submit" loading={enviando}>
              {activo ? t('inactivarEnviar') : t('reactivarEnviar')}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * spec 009 (FR-030, D119, D94, D151): eliminar va a la papelera. Con datos
 * relacionados no se ofrece: el botón sigue tocable y explica por qué y que
 * se puede inactivar (nunca un botón gris sin motivo). Rojo + ícono solo acá.
 */
export function DialogoEliminar({
  trigger,
  nombre,
  bloqueado,
  motivoBloqueo,
  onConfirmar,
}: {
  trigger: ReactElement;
  nombre: string;
  bloqueado: boolean;
  motivoBloqueo: string;
  onConfirmar: () => Promise<boolean>;
}) {
  const t = useTranslations('ministerios');
  const [abierto, setAbierto] = useState(false);
  const { enviando, ejecutar } = useEnvio(async () => {
    if (await onConfirmar()) setAbierto(false);
  });
  return (
    <AlertDialog open={abierto} onOpenChange={setAbierto}>
      <AlertDialogTrigger render={trigger} />
      <AlertDialogContent data-tono={bloqueado ? 'neutro' : 'destructivo'}>
        <AlertDialogHeader>
          <AlertDialogTitle>{bloqueado ? t('noSeEliminaTitulo', { nombre }) : t('eliminarTitulo', { nombre })}</AlertDialogTitle>
          <AlertDialogDescription>{bloqueado ? motivoBloqueo : t('eliminarDescripcion')}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{bloqueado ? t('entendido') : t('cancelar')}</AlertDialogCancel>
          {!bloqueado && (
            <Button type="button" variant="destructive" loading={enviando} onClick={() => void ejecutar()}>
              {t('eliminarEnviar')}
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
