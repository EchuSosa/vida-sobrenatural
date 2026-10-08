'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { BookOpenCheck, CircleCheck, Hourglass, Info, Sparkles } from 'lucide-react';
import { ApiError, apiFetch, erroresPorCampo, formatearDiaEnArgentina, type VidaDeServicioDePersona } from '@vida-sobrenatural/shared-types';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
  MensajeErrorCampo,
  ResumenErrores,
  useEnvio,
} from '@vida-sobrenatural/ui';

const ICONO: Record<VidaDeServicioDePersona['estado'], typeof Info> = {
  no_cumple: Info,
  lo_pide_su_tutor: Sparkles,
  puede_pedir: Sparkles,
  pendiente: Hourglass,
  en_curso: BookOpenCheck,
  completada: CircleCheck,
};

/**
 * spec 008, T033 (FR-013, D97, D151): la Vida de Servicio de una Persona en
 * su Perfil, con texto + ícono (D81). "Pedir Vida de Servicio en su nombre"
 * muestra el nombre durante toda la acción (docs/15) y queda deshabilitado
 * con la razón cuando no cumple el requisito. Es reversible (el Admin lo
 * resuelve después en Solicitudes): confirmación neutra.
 */
export function VidaDeServicioPersonaCliente({
  personaId,
  nombre,
  vs,
  apiToken,
  puedePedir,
  puedeVerSolicitudes,
}: {
  personaId: string;
  nombre: string;
  vs: VidaDeServicioDePersona;
  apiToken: string;
  puedePedir: boolean;
  puedeVerSolicitudes: boolean;
}) {
  const t = useTranslations('solicitudesServicio');
  const tp = useTranslations('solicitudesServicio.perfil');
  const te = useTranslations('errors');
  const locale = useLocale();
  const router = useRouter();
  const Icono = ICONO[vs.estado];
  const [abierto, setAbierto] = useState(false);
  const [elegida, setElegida] = useState<string | null>(vs.ediciones.length === 1 ? vs.ediciones[0].grupoId : null);
  const [error, setError] = useState<string | undefined>();
  const [foco, setFoco] = useState(0);

  const { enviando, ejecutar } = useEnvio(async () => {
    if (vs.ediciones.length > 0 && !elegida) {
      setError(te('campos.EDICION_REQUERIDA'));
      setFoco((f) => f + 1);
      return;
    }
    try {
      await apiFetch('/vida-de-servicio/solicitudes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` },
        body: JSON.stringify({ personaId, grupoId: vs.ediciones.length > 0 ? elegida : null }),
      });
      toast.success(tp('pedidoCargado', { nombre }));
      setAbierto(false);
    } catch (e) {
      const campo = erroresPorCampo(e)?.find((c) => c.campo === 'grupoId');
      if (campo) {
        setError(te.has(`campos.${campo.code}`) ? te(`campos.${campo.code}`) : t('errorGenerico'));
        setFoco((f) => f + 1);
        return;
      }
      const code = e instanceof ApiError ? e.code : null;
      toast.error(code && te.has(code) ? te(code) : t('errorGenerico'));
      setAbierto(false);
    }
    router.refresh();
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-3">
        <Icono aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
        <div className="flex flex-col gap-1">
          <p className="font-medium">{tp(`estados.${vs.estado}`)}</p>
          {vs.motivo && <p className="text-muted-foreground">{tp(`motivos.${vs.motivo}`)}</p>}
          {vs.edicion && <p className="text-muted-foreground">{tp('edicion', { nombre: vs.edicion.nombre })}</p>}
          {vs.solicitudPendienteId && puedeVerSolicitudes && (
            <Link href={`/solicitudes/vida-de-servicio/${vs.solicitudPendienteId}`} className="w-fit underline underline-offset-2">
              {tp('verPedido')}
            </Link>
          )}
        </div>
      </div>

      {puedePedir && (vs.estado === 'puede_pedir' || vs.estado === 'lo_pide_su_tutor' || vs.estado === 'no_cumple') && (
        <div className="flex flex-col gap-1">
          {!vs.puedePedirEnSuNombre && vs.motivo && (
            <p id="pedir-vs-razon" className="text-sm text-muted-foreground">
              {tp('noPuedePedir', { motivo: tp(`motivos.${vs.motivo}`) })}
            </p>
          )}
          <AlertDialog open={abierto} onOpenChange={setAbierto}>
            <AlertDialogTrigger
              render={
                <Button type="button" variant="outline" className="h-11 w-fit" disabled={!vs.puedePedirEnSuNombre} aria-describedby={vs.puedePedirEnSuNombre ? undefined : 'pedir-vs-razon'}>
                  <BookOpenCheck aria-hidden />
                  {tp('pedirEnSuNombre')}
                </Button>
              }
            />
            <AlertDialogContent data-tono="neutro">
              <form
                className="flex flex-col gap-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  void ejecutar();
                }}
              >
                <AlertDialogHeader>
                  <AlertDialogTitle>{tp('pedirTitulo', { nombre })}</AlertDialogTitle>
                  <AlertDialogDescription>{tp('pedirDescripcion', { nombre })}</AlertDialogDescription>
                </AlertDialogHeader>
                <ResumenErrores errores={error ? [{ campo: 'grupoId', mensaje: error }] : []} titulo={t('resumenErrores')} foco={foco} />
                {vs.ediciones.length === 0 ? (
                  <p className="text-muted-foreground">{tp('paraLaProxima')}</p>
                ) : (
                  <fieldset id="campo-grupoId" tabIndex={-1} className="flex flex-col gap-2 outline-none" aria-describedby={error ? 'error-grupoId' : undefined}>
                    <legend className="mb-2 font-medium">{t('edicionEtiqueta')}</legend>
                    {vs.ediciones.map((e) => (
                      <label
                        key={e.grupoId}
                        htmlFor={`pedir-edicion-${e.grupoId}`}
                        className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-border p-3 has-[:checked]:border-primary"
                      >
                        <input
                          id={`pedir-edicion-${e.grupoId}`}
                          type="radio"
                          name="grupoId"
                          checked={elegida === e.grupoId}
                          onChange={() => {
                            setElegida(e.grupoId);
                            setError(undefined);
                          }}
                          className="size-4 accent-primary"
                        />
                        {t('edicionOpcion', { nombre: e.nombre, fecha: formatearDiaEnArgentina(e.fechaInicio, locale) })}
                      </label>
                    ))}
                    <MensajeErrorCampo id="error-grupoId" mensaje={error} />
                  </fieldset>
                )}
                <AlertDialogFooter>
                  <Button type="button" variant="outline" className="h-11" onClick={() => setAbierto(false)} disabled={enviando}>
                    {t('volver')}
                  </Button>
                  <Button type="submit" className="h-11" loading={enviando}>
                    {tp('pedirEnviar')}
                  </Button>
                </AlertDialogFooter>
              </form>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  );
}
