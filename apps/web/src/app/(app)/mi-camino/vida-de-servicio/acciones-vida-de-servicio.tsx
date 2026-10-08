'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { BookOpenCheck, Undo2 } from 'lucide-react';
import { ApiError, apiFetch, erroresPorCampo } from '@vida-sobrenatural/shared-types';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
  ConfirmDestructiveDialog,
  MensajeErrorCampo,
  ResumenErrores,
  useEnvio,
} from '@vida-sobrenatural/ui';

/**
 * spec 008, T027 (FR-010, FR-011, FR-012, D151): "Quiero anotarme" y
 * "Retirar mi pedido" en la card de Vida de Servicio. Las dos son
 * reversibles: confirmaciones neutras. Al terminar, `router.refresh()` vuelve
 * a pedir el estado y la card cambia sin recargar.
 */

function useLlamarApi() {
  const { data: session } = useSession();
  return function llamar<T>(ruta: string, init: RequestInit = {}) {
    return apiFetch<T>(ruta, {
      ...init,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.apiToken}`, ...init.headers },
    });
  };
}

function useMensajeDeError() {
  const t = useTranslations('vidaDeServicio.card');
  const te = useTranslations('errors');
  return (error: unknown) => {
    const code = error instanceof ApiError ? error.code : null;
    return code && te.has(code) ? te(code) : t('errorGenerico');
  };
}

export interface OpcionEdicion {
  grupoId: string;
  etiqueta: string;
  ayuda: string;
}

/**
 * "Quiero anotarme": elegir la edición (preelegida si hay una sola, FR-010) o,
 * si no hay ninguna abierta, anotarse para la próxima (FR-011). El error de
 * edición (cerró la inscripción mientras tanto) se muestra en el campo.
 */
export function PedirVidaDeServicio({ ediciones }: { ediciones: OpcionEdicion[] }) {
  const t = useTranslations('vidaDeServicio.card');
  const te = useTranslations('errors');
  const router = useRouter();
  const llamar = useLlamarApi();
  const mensajeDeError = useMensajeDeError();
  const [abierto, setAbierto] = useState(false);
  const [elegida, setElegida] = useState<string | null>(ediciones.length === 1 ? ediciones[0].grupoId : null);
  const [error, setError] = useState<string | undefined>();
  const [foco, setFoco] = useState(0);

  const { enviando, ejecutar } = useEnvio(async () => {
    if (ediciones.length > 0 && !elegida) {
      setError(te('campos.EDICION_REQUERIDA'));
      setFoco((f) => f + 1);
      return;
    }
    try {
      await llamar('/vida-de-servicio/solicitudes/me', { method: 'POST', body: JSON.stringify({ grupoId: ediciones.length > 0 ? elegida : null }) });
      toast.success(t('pedidoEnviado'));
      setAbierto(false);
    } catch (e) {
      const campo = erroresPorCampo(e)?.find((c) => c.campo === 'grupoId');
      if (campo) {
        setError(te.has(`campos.${campo.code}`) ? te(`campos.${campo.code}`) : t('errorGenerico'));
        setFoco((f) => f + 1);
        return;
      }
      toast.error(mensajeDeError(e));
      setAbierto(false);
    }
    router.refresh();
  });

  return (
    <AlertDialog open={abierto} onOpenChange={setAbierto}>
      <AlertDialogTrigger
        render={
          <Button type="button" size="xl" className="w-fit text-base">
            <BookOpenCheck aria-hidden />
            {ediciones.length > 0 ? t('quieroAnotarme') : t('paraLaProxima')}
          </Button>
        }
      />
      <AlertDialogContent className="max-h-[90dvh] overflow-y-auto">
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void ejecutar();
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>{t('pedirTitulo')}</AlertDialogTitle>
            <AlertDialogDescription>{t('pedirDescripcion')}</AlertDialogDescription>
          </AlertDialogHeader>
          <ResumenErrores errores={error ? [{ campo: 'grupoId', mensaje: error }] : []} titulo={t('resumenErrores')} foco={foco} />
          {ediciones.length > 0 ? (
            <fieldset id="campo-grupoId" tabIndex={-1} className="flex flex-col gap-2 outline-none" aria-describedby={error ? 'error-grupoId' : undefined}>
              <legend className="mb-2 text-base font-medium">{t('edicionEtiqueta')}</legend>
              {ediciones.map((e) => (
                <label
                  key={e.grupoId}
                  htmlFor={`edicion-${e.grupoId}`}
                  className="grid min-h-11 cursor-pointer grid-cols-[auto_1fr] gap-x-3 rounded-md border border-border p-3 text-base has-[:checked]:border-primary"
                >
                  <input
                    id={`edicion-${e.grupoId}`}
                    type="radio"
                    name="grupoId"
                    value={e.grupoId}
                    checked={elegida === e.grupoId}
                    onChange={() => {
                      setElegida(e.grupoId);
                      setError(undefined);
                    }}
                    className="row-span-2 mt-1 size-5 accent-primary"
                  />
                  <span className="font-medium">{e.etiqueta}</span>
                  <span className="text-muted-foreground">{e.ayuda}</span>
                </label>
              ))}
              <MensajeErrorCampo id="error-grupoId" mensaje={error} />
            </fieldset>
          ) : (
            <p className="text-base text-muted-foreground">{t('puedePedirSinEdiciones')}</p>
          )}
          <AlertDialogFooter>
            <Button type="button" variant="outline" size="xl" className="text-base" onClick={() => setAbierto(false)} disabled={enviando}>
              {t('volver')}
            </Button>
            <Button type="submit" size="xl" className="text-base" loading={enviando}>
              {t('enviarPedido')}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** "Retirar mi pedido" mientras está pendiente (FR-012). Confirmación neutra (D151). */
export function RetirarPedidoVidaDeServicio() {
  const t = useTranslations('vidaDeServicio.card');
  const router = useRouter();
  const llamar = useLlamarApi();
  const mensajeDeError = useMensajeDeError();

  const { enviando, ejecutar } = useEnvio(async () => {
    try {
      await llamar('/vida-de-servicio/solicitudes/me', { method: 'DELETE' });
      toast.success(t('retirado'));
    } catch (e) {
      toast.error(mensajeDeError(e));
    }
    router.refresh();
  });

  return (
    <ConfirmDestructiveDialog
      tono="neutro"
      trigger={
        <Button type="button" variant="outline" size="xl" className="w-fit text-base" loading={enviando}>
          <Undo2 aria-hidden />
          {t('retirar')}
        </Button>
      }
      titulo={t('retirarTitulo')}
      descripcion={t('retirarDescripcion')}
      textoConfirmar={t('retirarConfirmar')}
      textoCancelar={t('retirarMantener')}
      onConfirmar={() => void ejecutar()}
    />
  );
}
