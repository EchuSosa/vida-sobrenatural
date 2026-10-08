'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { FlagTriangleRight, UserMinus } from 'lucide-react';
import { ApiError, MOTIVO_MAX, apiFetch, erroresPorCampo, type TipoBaja } from '@vida-sobrenatural/shared-types';
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
 * spec 008, T058 + T062 (FR-032, FR-035, D151): las acciones del Líder sobre
 * su edición. Las dos son propuestas que la iglesia revisa (reversibles):
 * confirmaciones neutras. Al terminar, `router.refresh()` trae el detalle
 * actualizado.
 */

function useLlamar() {
  const { data: session } = useSession();
  return (ruta: string, body?: unknown) =>
    apiFetch(`/vida-de-servicio/mis-grupos${ruta}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.apiToken}` },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
}

function useMensajeDeError() {
  const t = useTranslations('misGrupos');
  const te = useTranslations('errors');
  return (e: unknown) => {
    const code = e instanceof ApiError ? e.code : null;
    return code && te.has(code) ? te(code) : t('errorGenerico');
  };
}

/** "Proponer baja": el tipo explicado en palabras y un comentario opcional (FR-032). */
export function ProponerBaja({ grupoId, inscripcionId, nombre }: { grupoId: string; inscripcionId: string; nombre: string }) {
  const t = useTranslations('misGrupos');
  const te = useTranslations('errors');
  const router = useRouter();
  const llamar = useLlamar();
  const mensajeDeError = useMensajeDeError();
  const [abierto, setAbierto] = useState(false);
  const [tipo, setTipo] = useState<TipoBaja>('dada_de_baja');
  const [comentario, setComentario] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [foco, setFoco] = useState(0);

  const { enviando, ejecutar } = useEnvio(async () => {
    if (comentario.trim().length > MOTIVO_MAX) {
      setError(te('campos.MOTIVO_DEMASIADO_LARGO'));
      setFoco((f) => f + 1);
      return;
    }
    try {
      await llamar(`/${grupoId}/inscripciones/${inscripcionId}/baja/proponer`, { tipo, comentario: comentario.trim() || undefined });
      toast.success(t('detalle.bajaPropuestaOk', { nombre }));
      setAbierto(false);
    } catch (e) {
      if (erroresPorCampo(e)) {
        setError(te('campos.MOTIVO_DEMASIADO_LARGO'));
        setFoco((f) => f + 1);
        return;
      }
      toast.error(mensajeDeError(e));
      setAbierto(false);
    }
    router.refresh();
  });

  const idTipo = `tipo-${inscripcionId}`;
  return (
    <AlertDialog open={abierto} onOpenChange={setAbierto}>
      <AlertDialogTrigger
        render={
          <Button type="button" variant="outline" size="xl" className="w-full text-base sm:w-fit">
            <UserMinus aria-hidden />
            {t('detalle.proponerBaja', { nombre })}
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
            <AlertDialogTitle>{t('detalle.proponerBajaTitulo', { nombre })}</AlertDialogTitle>
            <AlertDialogDescription>{t('detalle.proponerBajaDescripcion', { nombre })}</AlertDialogDescription>
          </AlertDialogHeader>
          <ResumenErrores errores={error ? [{ campo: 'comentario', mensaje: error }] : []} titulo={t('resumenErrores')} foco={foco} />
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-base font-medium">{t('detalle.tipoEtiqueta')}</legend>
            {(['dada_de_baja', 'abandono'] as const).map((valor) => (
              <label key={valor} htmlFor={`${idTipo}-${valor}`} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-border p-3 text-base has-[:checked]:border-primary">
                <input id={`${idTipo}-${valor}`} type="radio" name={idTipo} checked={tipo === valor} onChange={() => setTipo(valor)} className="size-5 accent-primary" />
                {valor === 'dada_de_baja' ? t('detalle.tipoDadaDeBaja') : t('detalle.tipoAbandono')}
              </label>
            ))}
          </fieldset>
          <div className="flex flex-col gap-1">
            <label htmlFor="campo-comentario" className="text-base font-medium">
              {t('detalle.comentarioEtiqueta')}
            </label>
            <textarea
              id="campo-comentario"
              value={comentario}
              onChange={(e) => {
                setComentario(e.target.value);
                setError(undefined);
              }}
              rows={3}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'campo-comentario-error campo-comentario-ayuda' : 'campo-comentario-ayuda'}
              className="rounded-md border border-input bg-background p-3 text-base"
            />
            <p id="campo-comentario-ayuda" className="text-sm text-muted-foreground">
              {t('detalle.comentarioAyuda')}
            </p>
            <MensajeErrorCampo id="campo-comentario-error" mensaje={error} />
          </div>
          <AlertDialogFooter>
            <Button type="button" variant="outline" size="xl" className="text-base" onClick={() => setAbierto(false)} disabled={enviando}>
              {t('volver')}
            </Button>
            <Button type="submit" size="xl" className="text-base" loading={enviando}>
              {t('detalle.proponerBajaEnviar')}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** "Proponer cerrar la edición" (FR-035): visible desde la fecha de la última semana. */
export function ProponerFinalizacion({ grupoId, nombre }: { grupoId: string; nombre: string }) {
  const t = useTranslations('misGrupos');
  const router = useRouter();
  const llamar = useLlamar();
  const mensajeDeError = useMensajeDeError();
  const { enviando, ejecutar } = useEnvio(async () => {
    try {
      await llamar(`/${grupoId}/finalizacion/proponer`);
      toast.success(t('detalle.finalizacionPropuestaOk'));
    } catch (e) {
      toast.error(mensajeDeError(e));
    }
    router.refresh();
  });
  return (
    <ConfirmDestructiveDialog
      tono="neutro"
      trigger={
        <Button type="button" size="xl" className="w-full text-base sm:w-fit" loading={enviando}>
          <FlagTriangleRight aria-hidden />
          {t('detalle.proponerFinalizacion')}
        </Button>
      }
      titulo={t('detalle.proponerFinalizacionTitulo', { nombre })}
      descripcion={t('detalle.proponerFinalizacionDescripcion')}
      textoConfirmar={t('detalle.proponerFinalizacionEnviar')}
      textoCancelar={t('volver')}
      onConfirmar={() => void ejecutar()}
    />
  );
}
