'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { CalendarX, Droplets, Undo2 } from 'lucide-react';
import { ApiError, COMENTARIO_BAUTISMO_MAX, apiFetch, erroresPorCampo, errorTalleRemera, type TalleRemera } from '@vida-sobrenatural/shared-types';
import { Button, CampoTalleRemera, ConfirmDestructiveDialog, DialogoTextoOpcional, useEnvio } from '@vida-sobrenatural/ui';

/**
 * spec 010, T020 y T043 (FR-001, FR-020, FR-020a, D151, H-50, H-57): las
 * acciones de la card de Bautismo. Pedir abre un paso de confirmación con el
 * talle de remera obligatorio (D229) y el campo opcional "¿Querés contarnos
 * algo?" (errores por campo con la pieza compartida); retirar y "No puedo ese día" son reversibles, así que sus
 * diálogos son neutros. Al terminar, `router.refresh()` vuelve a pedir el
 * estado y la card cambia sin recargar la página.
 */

function useLlamar() {
  const { data: session } = useSession();
  return (ruta: string, body?: unknown) =>
    apiFetch(ruta, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.apiToken}` },
      body: JSON.stringify(body ?? {}),
    });
}

function useMensajeDeError() {
  const t = useTranslations('miCamino.bautismo');
  const te = useTranslations('errors');
  return (error: unknown) => {
    const code = error instanceof ApiError ? error.code : null;
    return code && te.has(code) ? te(code) : t('errorGenerico');
  };
}

/** "Quiero bautizarme" (FR-001): un toque abre el paso, otro lo confirma (SC-001). */
export function PedirBautismo() {
  const t = useTranslations('miCamino.bautismo');
  const te = useTranslations('errors');
  const router = useRouter();
  const llamar = useLlamar();
  const mensajeDeError = useMensajeDeError();
  const [talle, setTalle] = useState<TalleRemera | ''>('');
  const errorDeTalle = (code: string | null) => (code ? te(`campos.${code}`) : null);

  return (
    <DialogoTextoOpcional
      trigger={
        <Button type="button" size="xl" className="w-fit text-base">
          <Droplets aria-hidden />
          {t('pedir')}
        </Button>
      }
      titulo={t('pedirTitulo')}
      descripcion={t('pedirDescripcion')}
      campo="comentario"
      etiqueta={t('comentarioEtiqueta')}
      ayuda={t('comentarioAyuda')}
      max={COMENTARIO_BAUTISMO_MAX}
      contador={(cantidad, maximo) => t('comentarioContador', { cantidad, maximo })}
      mensajeDemasiadoLargo={te('campos.COMENTARIO_DEMASIADO_LARGO')}
      tituloResumen={t('resumenErrores')}
      textoEnviar={t('pedirEnviar')}
      textoVolver={t('pedirVolver')}
      validar={(): Record<string, string> => {
        const error = errorDeTalle(errorTalleRemera(talle));
        return error ? { talleRemera: error } : {};
      }}
      alCerrar={() => setTalle('')}
      onEnviar={async (comentario) => {
        try {
          await llamar('/bautismo/solicitudes/me', { comentario: comentario ?? undefined, talleRemera: talle });
          toast.success(t('pedidoEnviado'));
        } catch (error) {
          const campos = erroresPorCampo(error);
          if (campos) return { errores: Object.fromEntries(campos.map(({ campo, code }) => [campo, te(`campos.${code}`)])) };
          toast.error(mensajeDeError(error));
        }
        router.refresh();
      }}
    >
      {({ mensajes, limpiar, enviando }) => (
        <CampoTalleRemera
          valor={talle}
          onCambiar={(valor) => {
            setTalle(valor);
            limpiar('talleRemera');
          }}
          etiqueta={t('talleEtiqueta')}
          placeholder={t('tallePlaceholder')}
          ayuda={t('talleAyuda')}
          error={mensajes.talleRemera}
          disabled={enviando}
        />
      )}
    </DialogoTextoOpcional>
  );
}

/** "Retirar el pedido" (FR-020): diálogo neutro que dice qué pasa con la fecha, si tenía. */
export function RetirarBautismo({ conFecha }: { conFecha: boolean }) {
  const t = useTranslations('miCamino.bautismo');
  const router = useRouter();
  const llamar = useLlamar();
  const mensajeDeError = useMensajeDeError();
  const { enviando, ejecutar } = useEnvio(async () => {
    try {
      await llamar('/bautismo/solicitudes/me/retirar');
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
        <Button type="button" variant="outline" size="xl" className="w-fit text-base" loading={enviando}>
          <Undo2 aria-hidden />
          {t('retirar')}
        </Button>
      }
      titulo={t('retirarTitulo')}
      descripcion={conFecha ? t('retirarDescripcionConFecha') : t('retirarDescripcion')}
      textoConfirmar={t('retirarConfirmar')}
      textoCancelar={t('retirarMantener')}
      onConfirmar={() => void ejecutar()}
    />
  );
}

/** "No puedo ese día" (FR-020a): sale de la fecha y sigue aceptada. Neutro (D151). */
export function NoPuedoEseDia() {
  const t = useTranslations('miCamino.bautismo');
  const router = useRouter();
  const llamar = useLlamar();
  const mensajeDeError = useMensajeDeError();
  const { enviando, ejecutar } = useEnvio(async () => {
    try {
      await llamar('/bautismo/solicitudes/me/no-puedo');
      toast.success(t('noPuedoListo'));
    } catch (error) {
      toast.error(mensajeDeError(error));
    }
    router.refresh();
  });

  return (
    <ConfirmDestructiveDialog
      tono="neutro"
      trigger={
        <Button type="button" variant="outline" size="xl" className="w-fit text-base" loading={enviando}>
          <CalendarX aria-hidden />
          {t('noPuedo')}
        </Button>
      }
      titulo={t('noPuedoTitulo')}
      descripcion={t('noPuedoDescripcion')}
      textoConfirmar={t('noPuedoConfirmar')}
      textoCancelar={t('noPuedoVolver')}
      onConfirmar={() => void ejecutar()}
    />
  );
}
