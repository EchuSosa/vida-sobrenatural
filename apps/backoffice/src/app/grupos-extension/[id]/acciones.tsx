'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Check, CirclePause, CirclePlay, UserMinus, X } from 'lucide-react';
import { ApiError, MENSAJE_RECHAZO_GRUPO_EXTENSION_MAX, apiFetch, erroresPorCampo } from '@vida-sobrenatural/shared-types';
import { Button, ConfirmDestructiveDialog, DialogoTextoOpcional, useEnvio } from '@vida-sobrenatural/ui';
import { BuscarPersonaGex } from '../buscar-persona';

/** Llama a la API y avisa el resultado; siempre refresca la pantalla (D226). */
function useAccionGex() {
  const t = useTranslations('gruposExtension');
  const te = useTranslations('errors');
  const router = useRouter();
  return async (url: string, apiToken: string, exito: string, cuerpo?: object) => {
    try {
      await apiFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` },
        body: cuerpo ? JSON.stringify(cuerpo) : undefined,
      });
      toast.success(exito);
    } catch (error) {
      if (erroresPorCampo(error)) throw error;
      toast.error(error instanceof ApiError && te.has(error.code) ? te(error.code) : t('errorGenerico'));
    }
    router.refresh();
  };
}

/** Aceptar o "No es para este grupo" (mensaje opcional), desde el detalle del Grupo o de la bandeja. */
export function ResolverPedido({ solicitudId, nombre, apiToken, deshabilitarAceptar = false }: { solicitudId: string; nombre: string; apiToken: string; deshabilitarAceptar?: boolean }) {
  const t = useTranslations('gruposExtension.detalle');
  const accion = useAccionGex();
  const aceptar = useEnvio(() => accion(`/solicitudes-grupo-extension/${solicitudId}/aceptar`, apiToken, t('aceptado', { nombre })));
  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" size="sm" loading={aceptar.enviando} disabled={deshabilitarAceptar} aria-label={t('aceptarAria', { nombre })} onClick={() => void aceptar.ejecutar()}>
        <Check aria-hidden />
        {t('aceptar')}
      </Button>
      <DialogoTextoOpcional
        tono="neutro"
        trigger={
          <Button type="button" size="sm" variant="outline" disabled={aceptar.enviando} aria-label={t('rechazarAria', { nombre })}>
            <X aria-hidden />
            {t('rechazar')}
          </Button>
        }
        titulo={t('rechazarTitulo', { nombre })}
        descripcion={t('rechazarDescripcion')}
        campo={`mensaje-${solicitudId}`}
        etiqueta={t('rechazarMensaje', { nombre })}
        ayuda={t('rechazarMensajeAyuda')}
        max={MENSAJE_RECHAZO_GRUPO_EXTENSION_MAX}
        contador={(cantidad, maximo) => t('contador', { cantidad, maximo })}
        mensajeDemasiadoLargo={t('demasiadoLargo', { maximo: MENSAJE_RECHAZO_GRUPO_EXTENSION_MAX })}
        tituloResumen={t('rechazarTitulo', { nombre })}
        textoEnviar={t('rechazarConfirmar')}
        textoVolver={t('rechazarVolver')}
        onEnviar={async (mensaje) => {
          try {
            await accion(`/solicitudes-grupo-extension/${solicitudId}/rechazar`, apiToken, t('rechazado', { nombre }), mensaje ? { mensaje } : {});
          } catch {
            return { errorCampo: t('demasiadoLargo', { maximo: MENSAJE_RECHAZO_GRUPO_EXTENSION_MAX }) };
          }
        }}
      />
    </div>
  );
}

/** Quitar a una integrante: reversible (se la puede volver a agregar) → confirmación neutra (D151). */
export function QuitarIntegrante({ grupoId, solicitudId, nombre, apiToken }: { grupoId: string; solicitudId: string; nombre: string; apiToken: string }) {
  const t = useTranslations('gruposExtension.detalle');
  const accion = useAccionGex();
  const { enviando, ejecutar } = useEnvio(() => accion(`/grupos-extension/${grupoId}/integrantes/${solicitudId}/quitar`, apiToken, t('quitado', { nombre })));
  return (
    <ConfirmDestructiveDialog
      tono="neutro"
      trigger={
        <Button type="button" size="sm" variant="outline" loading={enviando} aria-label={t('quitarAria', { nombre })}>
          <UserMinus aria-hidden />
          {t('quitar')}
        </Button>
      }
      titulo={t('quitarTitulo', { nombre })}
      descripcion={t('quitarDescripcion')}
      textoConfirmar={t('quitarConfirmar')}
      textoCancelar={t('quitarVolver')}
      onConfirmar={() => void ejecutar()}
    />
  );
}

export function AgregarIntegrante({ grupoId, apiToken, excluir }: { grupoId: string; apiToken: string; excluir: string[] }) {
  const t = useTranslations('gruposExtension.detalle');
  const accion = useAccionGex();
  return (
    <div className="flex flex-col gap-2 rounded-md border border-border p-3">
      <h3 className="text-sm font-semibold">{t('agregarTitulo')}</h3>
      <p className="text-sm text-muted-foreground">{t('agregarAyuda')}</p>
      <BuscarPersonaGex
        id="buscar-integrante"
        apiToken={apiToken}
        textoElegir={t('agregar')}
        ariaElegir={(nombre) => t('agregarAria', { nombre })}
        excluir={excluir}
        onElegir={(p) => accion(`/grupos-extension/${grupoId}/integrantes`, apiToken, t('agregado', { nombre: `${p.nombre} ${p.apellido}` }), { personaId: p.id })}
      />
    </div>
  );
}

/** Inactivar (con confirmación neutra: se puede reactivar, D151) o reactivar. */
export function BotonActivoGrupo({ grupoId, nombre, activo, apiToken }: { grupoId: string; nombre: string; activo: boolean; apiToken: string }) {
  const t = useTranslations('gruposExtension.detalle');
  const accion = useAccionGex();
  const inactivar = useEnvio(() => accion(`/grupos-extension/${grupoId}/inactivar`, apiToken, t('inactivado')));
  const reactivar = useEnvio(() => accion(`/grupos-extension/${grupoId}/reactivar`, apiToken, t('reactivado')));
  if (!activo) {
    return (
      <Button type="button" size="sm" variant="outline" loading={reactivar.enviando} onClick={() => void reactivar.ejecutar()}>
        <CirclePlay aria-hidden />
        {t('reactivar')}
      </Button>
    );
  }
  return (
    <ConfirmDestructiveDialog
      tono="neutro"
      trigger={
        <Button type="button" size="sm" variant="outline" loading={inactivar.enviando}>
          <CirclePause aria-hidden />
          {t('inactivar')}
        </Button>
      }
      titulo={t('inactivarTitulo', { nombre })}
      descripcion={t('inactivarDescripcion')}
      textoConfirmar={t('inactivarConfirmar')}
      textoCancelar={t('inactivarVolver')}
      onConfirmar={() => void inactivar.ejecutar()}
    />
  );
}
