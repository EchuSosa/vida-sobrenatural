'use client';

import { useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { CircleCheck, Undo2 } from 'lucide-react';
import { ApiError, COMENTARIO_DECLARACION_MAX, apiFetch, erroresPorCampo, type EtapaCamino } from '@vida-sobrenatural/shared-types';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  ConfirmDestructiveDialog,
  MensajeErrorCampo,
  ResumenErrores,
  cn,
  useEnvio,
  useValidacionCampos,
} from '@vida-sobrenatural/ui';

/**
 * spec 006, T041 (FR-008, FR-009, FR-011, D151): "Ya lo hice" y "Retirar" en
 * las cards de Mi camino. Las dos son reversibles, así que sus confirmaciones
 * son neutras (no rojas). Al terminar, `router.refresh()` vuelve a pedir
 * `GET /camino/me` y la card cambia sin recargar la página.
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
  const t = useTranslations('miCamino.estados');
  const te = useTranslations('errors');
  return (error: unknown) => {
    const code = error instanceof ApiError ? error.code : null;
    return code && te.has(code) ? te(code) : t('errorGenerico');
  };
}

/** "Ya lo hice": un paso, con comentario opcional de hasta 500 y su contador (FR-009). */
export function YaLoHice({ etapa, nombreEtapa }: { etapa: EtapaCamino; nombreEtapa: string }) {
  const t = useTranslations('miCamino.estados');
  const te = useTranslations('errors');
  const router = useRouter();
  const llamar = useLlamarApi();
  const mensajeDeError = useMensajeDeError();
  const validacion = useValidacionCampos();
  const [abierto, setAbierto] = useState(false);
  const [comentario, setComentario] = useState('');
  const idBase = useId();
  const idCampo = 'campo-comentario';
  const largo = comentario.trim().length;

  function cerrar(abrir: boolean) {
    setAbierto(abrir);
    if (!abrir) {
      setComentario('');
      validacion.reset();
    }
  }

  const { enviando, ejecutar } = useEnvio(async () => {
    if (largo > COMENTARIO_DECLARACION_MAX) {
      validacion.reemplazar({ comentario: te('campos.COMENTARIO_DEMASIADO_LARGO') });
      return;
    }
    try {
      await llamar('/camino/me/declaraciones', { method: 'POST', body: JSON.stringify({ etapa, comentario: comentario.trim() || undefined }) });
      cerrar(false);
      toast.success(t('yaLoHiceEnviado'));
    } catch (error) {
      if (erroresPorCampo(error)) {
        validacion.reemplazar({ comentario: te('campos.COMENTARIO_DEMASIADO_LARGO') });
        return;
      }
      // Otro rechazo (ya estaba pendiente, ya figura hecha…): se avisa y la card muestra el estado real.
      cerrar(false);
      toast.error(mensajeDeError(error));
    }
    router.refresh();
  });

  return (
    <AlertDialog open={abierto} onOpenChange={cerrar}>
      <Button type="button" variant="outline" size="xl" className="text-base" onClick={() => setAbierto(true)}>
        <CircleCheck aria-hidden />
        {t('yaLoHice')}
      </Button>
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
            <AlertDialogTitle>{t('yaLoHiceTitulo', { etapa: nombreEtapa })}</AlertDialogTitle>
            <AlertDialogDescription>{t('yaLoHiceDescripcion')}</AlertDialogDescription>
          </AlertDialogHeader>
          <ResumenErrores errores={validacion.resumen} foco={validacion.foco} titulo={t('resumenErrores')} />
          <div className="flex flex-col gap-2">
            <label htmlFor={idCampo} className="text-base font-medium">
              {t('comentarioEtiqueta')}
            </label>
            <p id={`${idBase}-ayuda`} className="text-base text-muted-foreground">
              {t('comentarioAyuda')}
            </p>
            <textarea
              id={idCampo}
              value={comentario}
              rows={3}
              onChange={(e) => {
                setComentario(e.target.value);
                if (e.target.value.trim().length <= COMENTARIO_DECLARACION_MAX) validacion.limpiar('comentario');
              }}
              aria-invalid={validacion.mensajes.comentario ? true : undefined}
              aria-describedby={cn(`${idBase}-ayuda`, `${idBase}-contador`, validacion.mensajes.comentario && `${idCampo}-error`)}
              disabled={enviando}
              className="min-h-24 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30"
            />
            <p id={`${idBase}-contador`} className={cn('text-sm text-muted-foreground', largo > COMENTARIO_DECLARACION_MAX && 'font-medium text-foreground')}>
              {t('comentarioContador', { cantidad: largo, maximo: COMENTARIO_DECLARACION_MAX })}
            </p>
            <MensajeErrorCampo id={`${idCampo}-error`} mensaje={validacion.mensajes.comentario} />
          </div>
          <AlertDialogFooter>
            <Button type="button" variant="ghost" size="xl" className="text-base" onClick={() => cerrar(false)}>
              {t('yaLoHiceVolver')}
            </Button>
            <Button type="submit" size="xl" className="text-base" loading={enviando}>
              {t('yaLoHiceEnviar')}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** "Retirar" lo que contó, mientras la iglesia lo revisa (FR-011). Confirmación neutra (D151). */
export function RetirarDeclaracion({ declaracionId, nombreEtapa }: { declaracionId: string; nombreEtapa: string }) {
  const t = useTranslations('miCamino.estados');
  const router = useRouter();
  const llamar = useLlamarApi();
  const mensajeDeError = useMensajeDeError();

  const { enviando, ejecutar } = useEnvio(async () => {
    try {
      await llamar(`/camino/me/declaraciones/${declaracionId}`, { method: 'DELETE' });
      toast.success(t('retirado'));
    } catch (error) {
      toast.error(mensajeDeError(error));
    }
    router.refresh();
  });

  return (
    <ConfirmDestructiveDialog
      tono="neutro"
      trigger={
        <Button type="button" variant="outline" size="xl" className="text-base" loading={enviando}>
          <Undo2 aria-hidden />
          {t('retirar')}
        </Button>
      }
      titulo={t('retirarTitulo', { etapa: nombreEtapa })}
      descripcion={t('retirarDescripcion')}
      textoConfirmar={t('retirarConfirmar')}
      textoCancelar={t('retirarMantener')}
      onConfirmar={() => void ejecutar()}
    />
  );
}
