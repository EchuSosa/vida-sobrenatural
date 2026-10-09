'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { CircleCheck, Droplets, ShieldCheck, ShieldOff } from 'lucide-react';
import {
  ApiError,
  COMENTARIO_BAUTISMO_MAX,
  apiFetch,
  erroresPorCampo,
  errorTalleRemera,
  formatearFechaCorta,
  formatearInicioEvento,
  type BautismoDePersona,
  type TalleRemera,
} from '@vida-sobrenatural/shared-types';
import { Button, CampoTalleRemera, ConfirmDestructiveDialog, DialogoTextoOpcional, useEnvio } from '@vida-sobrenatural/ui';

/**
 * spec 010, T049 y T050 — la parte interactiva de la sección Bautismo del
 * Perfil. Habilitar y quitar la habilitación son reversibles (diálogos
 * neutros, D151); pedir en su nombre pide el talle de remera (obligatorio,
 * D229) y el comentario opcional, con el error por campo de la pieza compartida (H-50).
 */
export function BautismoPersonaCliente({
  personaId,
  datos,
  apiToken,
  puedeHabilitar,
  puedePedirEnNombre,
}: {
  personaId: string;
  datos: BautismoDePersona;
  apiToken: string;
  puedeHabilitar: boolean;
  puedePedirEnNombre: boolean;
}) {
  const t = useTranslations('personas.bautismo');
  const te = useTranslations('errors');
  const locale = useLocale();
  const [talle, setTalle] = useState<TalleRemera | ''>('');
  const router = useRouter();
  const fecha = (iso: string) => formatearFechaCorta(iso, locale);

  function mensajeDeError(error: unknown) {
    const code = error instanceof ApiError ? error.code : null;
    return code && te.has(code) ? te(code) : t('errorGenerico');
  }

  const { enviando: cambiando, ejecutar: cambiarHabilitacion } = useEnvio(async () => {
    try {
      await apiFetch(`/personas/${personaId}/habilitacion-bautismo`, {
        method: datos.habilitacion ? 'DELETE' : 'PUT',
        headers: { Authorization: `Bearer ${apiToken}` },
      });
      toast.success(datos.habilitacion ? t('deshabilitado') : t('habilitado'));
    } catch (error) {
      toast.error(mensajeDeError(error));
    }
    router.refresh();
  });

  const vn = datos.vidaNueva;
  const lineaVidaNueva =
    vn.estado === 'en_curso'
      ? vn.desde
        ? t('vidaNuevaEnCursoDesde', { fecha: fecha(vn.desde) })
        : t('vidaNuevaEnCurso')
      : vn.estado === 'completada'
        ? t('vidaNuevaCompletada')
        : t('vidaNuevaNinguna');
  const abierta = datos.solicitudAbierta;
  const puedePedir = puedePedirEnNombre && datos.activa && !datos.bautizada && !abierta;
  const mostrarHabilitar = puedeHabilitar && datos.activa && !datos.bautizada && (datos.habilitacion !== null || vn.estado === 'ninguna');

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-2">
        {datos.bautizada ? (
          <li className="flex items-center gap-2 font-medium">
            <CircleCheck aria-hidden className="size-4 text-primary" />
            {datos.bautizada.en ? t('bautizadaEl', { fecha: fecha(datos.bautizada.en) }) : t('bautizada')}
          </li>
        ) : (
          <li>{lineaVidaNueva}</li>
        )}
        {datos.habilitacion && (
          <li className="flex items-center gap-2">
            <ShieldCheck aria-hidden className="size-4 text-primary" />
            {datos.habilitacion.por
              ? t('habilitadaPor', { nombre: `${datos.habilitacion.por.nombre} ${datos.habilitacion.por.apellido}`, fecha: fecha(datos.habilitacion.en) })
              : t('habilitada', { fecha: fecha(datos.habilitacion.en) })}
          </li>
        )}
        {abierta && (
          <li>
            <Link href={`/solicitudes/bautismo/${abierta.id}`} className="font-medium text-primary underline underline-offset-2">
              {abierta.estado === 'pendiente'
                ? t('pedidoPendiente')
                : abierta.evento
                  ? t('pedidoConFecha', { fecha: formatearInicioEvento(abierta.evento.inicio, abierta.evento.fin, locale) })
                  : t('pedidoEsperandoFecha')}
            </Link>
          </li>
        )}
      </ul>

      {(mostrarHabilitar || puedePedir) && (
        <div className="flex flex-col gap-2 sm:flex-row">
          {mostrarHabilitar && (
            <ConfirmDestructiveDialog
              tono="neutro"
              trigger={
                <Button type="button" variant="outline" className="h-11" loading={cambiando}>
                  {datos.habilitacion ? <ShieldOff aria-hidden /> : <ShieldCheck aria-hidden />}
                  {datos.habilitacion ? t('deshabilitar') : t('habilitar')}
                </Button>
              }
              titulo={datos.habilitacion ? t('deshabilitarTitulo') : t('habilitarTitulo')}
              descripcion={datos.habilitacion ? t('deshabilitarDescripcion') : t('habilitarDescripcion')}
              textoConfirmar={datos.habilitacion ? t('deshabilitarEnviar') : t('habilitarEnviar')}
              textoCancelar={t('volver')}
              onConfirmar={() => void cambiarHabilitacion()}
            />
          )}
          {puedePedir && (
            <DialogoTextoOpcional
              trigger={
                <Button type="button" variant="outline" className="h-11">
                  <Droplets aria-hidden />
                  {t('pedirEnNombre')}
                </Button>
              }
              titulo={t('pedirEnNombreTitulo')}
              descripcion={t('pedirEnNombreDescripcion')}
              campo="comentario"
              etiqueta={t('comentarioEtiqueta')}
              ayuda={t('comentarioAyuda')}
              max={COMENTARIO_BAUTISMO_MAX}
              contador={(cantidad, maximo) => t('contador', { cantidad, maximo })}
              mensajeDemasiadoLargo={te('campos.COMENTARIO_DEMASIADO_LARGO')}
              tituloResumen={t('resumenErrores')}
              textoEnviar={t('pedirEnNombreEnviar')}
              textoVolver={t('volver')}
              validar={(): Record<string, string> => {
                const code = errorTalleRemera(talle);
                return code ? { talleRemera: te(`campos.${code}`) } : {};
              }}
              alCerrar={() => setTalle('')}
              onEnviar={async (comentario) => {
                try {
                  await apiFetch('/bautismo/solicitudes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` },
                    body: JSON.stringify({ personaId, comentario: comentario ?? undefined, talleRemera: talle }),
                  });
                  toast.success(t('pedidoCreado'));
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
          )}
        </div>
      )}
    </div>
  );
}
