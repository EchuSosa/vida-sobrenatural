'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { CircleCheck, CircleX } from 'lucide-react';
import {
  ApiError,
  MOTIVO_MAX,
  apiFetch,
  erroresPorCampo,
  formatearDiaEnArgentina,
  formatearFechaHora,
  type SolicitudVidaServicioDetalle,
} from '@vida-sobrenatural/shared-types';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
  DialogoTextoOpcional,
  MensajeErrorCampo,
  MigaDePan,
  ResumenErrores,
  useEnvio,
} from '@vida-sobrenatural/ui';

/**
 * spec 008, T032 (FR-015 a FR-018, D97, D151): el detalle de un pedido de
 * Vida de Servicio. Muestra la Persona, cómo cumple el requisito (o que hoy
 * ya no), la edición pedida y si lo cargó el equipo en su nombre. "Aprobar
 * inscripción" (principal) elige la edición en curso — preelegida la pedida
 * si sigue en curso; la inscripción cerrada no impide. "Rechazar" pide un
 * motivo opcional que solo ve el equipo. Las dos son reversibles para la
 * Persona (puede volver a pedir): confirmaciones neutras. Si otra pestaña ya
 * la resolvió, lo dice y recarga.
 */
export function SolicitudVsDetalleCliente({
  solicitud,
  apiToken,
  puedeResolver,
  puedeVerGrupos,
}: {
  solicitud: SolicitudVidaServicioDetalle;
  apiToken: string;
  puedeResolver: boolean;
  puedeVerGrupos: boolean;
}) {
  const t = useTranslations('solicitudesServicio');
  const tb = useTranslations('bandeja');
  const ts = useTranslations('solicitudes');
  const te = useTranslations('errors');
  const locale = useLocale();
  const router = useRouter();
  const nombre = `${solicitud.persona.nombre} ${solicitud.persona.apellido}`;
  const fechaHora = (iso: string) => formatearFechaHora(iso, locale);
  const dia = (iso: string) => formatearDiaEnArgentina(iso, locale);
  const p = solicitud.prerrequisito;

  function llamar(accion: 'aprobar' | 'rechazar', body: unknown) {
    return apiFetch(`/vida-de-servicio/solicitudes/${solicitud.id}/${accion}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` },
      body: JSON.stringify(body),
    });
  }

  function avisarError(error: unknown) {
    const code = error instanceof ApiError ? error.code : null;
    toast.error(code && te.has(code) ? te(code) : t('errorGenerico'));
    router.refresh();
  }

  const pedida = solicitud.edicionPedida;
  const textoPedida = !pedida
    ? t('paraLaProxima')
    : pedida.estado === 'finalizado'
      ? t('edicionPedidaFinalizada', { nombre: pedida.nombre })
      : pedida.inscripcionAbierta
        ? t('edicionPedida', { nombre: pedida.nombre })
        : t('edicionPedidaCerrada', { nombre: pedida.nombre });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-16">
      <MigaDePan tramos={[{ label: ts('titulo'), href: '/solicitudes' }, { label: nombre }]} LinkComponente={Link} />

      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">{t('titulo', { nombre })}</h1>
        <p className="text-muted-foreground">
          {t('edad', { edad: solicitud.persona.edad })} · {t('pidioEl', { fecha: fechaHora(solicitud.createdAt) })}
          {solicitud.persona.sinAccesoALaApp && ` · ${t('sinAccesoALaApp')}`}
        </p>
        <p className="font-medium">{tb(`estados.vida_de_servicio.${solicitud.estado}`)}</p>
        {solicitud.creadoPor && <p className="text-sm text-muted-foreground">{t('creadaPor', { nombre: `${solicitud.creadoPor.nombre} ${solicitud.creadoPor.apellido}` })}</p>}
        {solicitud.revisadoPor && solicitud.revisadaEn && (
          <p className="text-sm text-muted-foreground">
            {t('revisadaPor', { nombre: `${solicitud.revisadoPor.nombre} ${solicitud.revisadoPor.apellido}`, fecha: fechaHora(solicitud.revisadaEn) })}
          </p>
        )}
      </div>

      <section aria-labelledby="contacto-titulo" className="flex flex-col gap-1">
        <h2 id="contacto-titulo" className="text-lg font-semibold">
          {t('contacto')}
        </h2>
        {solicitud.persona.email || solicitud.persona.telefono ? (
          <ul className="flex flex-col gap-1">
            {solicitud.persona.telefono && (
              <li>
                <a href={`tel:${solicitud.persona.telefono}`} className="underline underline-offset-2">
                  {solicitud.persona.telefono}
                </a>
              </li>
            )}
            {solicitud.persona.email && <li className="break-all">{solicitud.persona.email}</li>}
          </ul>
        ) : (
          <p className="text-muted-foreground">{t('sinContacto')}</p>
        )}
      </section>

      <section aria-labelledby="prerrequisito-titulo" className="flex flex-col gap-1">
        <h2 id="prerrequisito-titulo" className="text-lg font-semibold">
          {t('prerrequisitoTitulo')}
        </h2>
        <p>
          {!p
            ? t('prerrequisitoNoCumple')
            : p.via === 'inscripcion'
              ? t('prerrequisitoInscripcion', { tipo: p.cursoTipo, fecha: p.cerradaEn ? dia(p.cerradaEn) : 'sin' })
              : t('prerrequisitoManual', { fecha: dia(p.fecha) })}
        </p>
      </section>

      <section aria-labelledby="edicion-titulo" className="flex flex-col gap-1">
        <h2 id="edicion-titulo" className="text-lg font-semibold">
          {t('edicionPedidaTitulo')}
        </h2>
        <p>{textoPedida}</p>
        {solicitud.inscripcion && (
          <p>
            {t('inscriptaEn', { nombre: solicitud.inscripcion.nombre })}{' '}
            {puedeVerGrupos && (
              <Link href={`/grupos/vida-de-servicio/${solicitud.inscripcion.grupoId}`} className="underline underline-offset-2">
                {t('verEdicion')}
              </Link>
            )}
          </p>
        )}
      </section>

      {solicitud.estado === 'rechazada' && solicitud.motivoRechazo && <p className="text-muted-foreground">{t('motivoMostrado', { motivo: solicitud.motivoRechazo })}</p>}

      {puedeResolver && solicitud.estado === 'pendiente' && (
        <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
          <DialogoTextoOpcional
            trigger={
              <Button type="button" variant="outline" className="h-11">
                <CircleX aria-hidden />
                {t('rechazar')}
              </Button>
            }
            titulo={t('rechazarTitulo', { nombre })}
            descripcion={t('rechazarDescripcion')}
            campo="motivo"
            etiqueta={t('motivoEtiqueta')}
            ayuda={t('motivoAyuda')}
            max={MOTIVO_MAX}
            contador={(cantidad, maximo) => t('contador', { cantidad, maximo })}
            mensajeDemasiadoLargo={te('campos.MOTIVO_DEMASIADO_LARGO')}
            tituloResumen={t('resumenErrores')}
            textoEnviar={t('rechazarEnviar')}
            textoVolver={t('volver')}
            onEnviar={async (motivo) => {
              try {
                await llamar('rechazar', { motivo: motivo ?? undefined });
                toast.success(t('rechazada', { nombre }));
              } catch (error) {
                if (erroresPorCampo(error)) return { errorCampo: te('campos.MOTIVO_DEMASIADO_LARGO') };
                avisarError(error);
                return;
              }
              router.refresh();
            }}
          />
          {p && <AprobarInscripcion solicitud={solicitud} nombre={nombre} llamar={llamar} avisarError={avisarError} />}
        </div>
      )}
    </div>
  );
}

/** "Aprobar inscripción": elegir la edición en curso (FR-016). Los errores de edición van en el campo. */
function AprobarInscripcion({
  solicitud,
  nombre,
  llamar,
  avisarError,
}: {
  solicitud: SolicitudVidaServicioDetalle;
  nombre: string;
  llamar: (accion: 'aprobar', body: unknown) => Promise<unknown>;
  avisarError: (error: unknown) => void;
}) {
  const t = useTranslations('solicitudesServicio');
  const te = useTranslations('errors');
  const locale = useLocale();
  const router = useRouter();
  const opciones = solicitud.edicionesEnCurso;
  const pedidaEnCurso = opciones.find((e) => e.grupoId === solicitud.edicionPedida?.grupoId && !e.yaCursada);
  const inicial = pedidaEnCurso?.grupoId ?? (opciones.filter((e) => !e.yaCursada).length === 1 ? opciones.find((e) => !e.yaCursada)!.grupoId : null);
  const [abierto, setAbierto] = useState(false);
  const [elegida, setElegida] = useState<string | null>(inicial);
  const [error, setError] = useState<string | undefined>();
  const [foco, setFoco] = useState(0);

  const { enviando, ejecutar } = useEnvio(async () => {
    if (!elegida) {
      setError(te('campos.EDICION_REQUERIDA'));
      setFoco((f) => f + 1);
      return;
    }
    try {
      await llamar('aprobar', { grupoId: elegida });
      toast.success(t('aprobada', { nombre }));
      setAbierto(false);
    } catch (e) {
      const campo = erroresPorCampo(e)?.find((c) => c.campo === 'grupoId');
      if (campo) {
        setError(te.has(`campos.${campo.code}`) ? te(`campos.${campo.code}`) : t('errorGenerico'));
        setFoco((f) => f + 1);
        return;
      }
      setAbierto(false);
      avisarError(e);
      return;
    }
    router.refresh();
  });

  return (
    <AlertDialog open={abierto} onOpenChange={setAbierto}>
      <AlertDialogTrigger
        render={
          <Button type="button" className="h-11">
            <CircleCheck aria-hidden />
            {t('aprobar')}
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
            <AlertDialogTitle>{t('aprobarTitulo', { nombre })}</AlertDialogTitle>
            <AlertDialogDescription>{t('aprobarDescripcion')}</AlertDialogDescription>
          </AlertDialogHeader>
          <ResumenErrores errores={error ? [{ campo: 'grupoId', mensaje: error }] : []} titulo={t('resumenErrores')} foco={foco} />
          {opciones.length === 0 ? (
            <p className="text-muted-foreground">{t('sinEdicionesEnCurso')}</p>
          ) : (
            <fieldset id="campo-grupoId" tabIndex={-1} className="flex flex-col gap-2 outline-none" aria-describedby={error ? 'error-grupoId' : undefined}>
              <legend className="mb-2 font-medium">{t('edicionEtiqueta')}</legend>
              {opciones.map((e) => {
                const notas = [!e.inscripcionAbierta && t('edicionCerrada'), e.yaCursada && t('edicionYaCursada')].filter(Boolean).join(' · ');
                return (
                  <label
                    key={e.grupoId}
                    htmlFor={`edicion-${e.grupoId}`}
                    className="grid min-h-11 cursor-pointer grid-cols-[auto_1fr] gap-x-3 rounded-md border border-border p-3 has-[:checked]:border-primary"
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
                      className="row-span-2 mt-1 size-4 accent-primary"
                    />
                    <span className="font-medium">{t('edicionOpcion', { nombre: e.nombre, fecha: formatearDiaEnArgentina(e.fechaInicio, locale) })}</span>
                    <span className="text-sm text-muted-foreground">{notas}</span>
                  </label>
                );
              })}
              <MensajeErrorCampo id="error-grupoId" mensaje={error} />
            </fieldset>
          )}
          <AlertDialogFooter>
            <Button type="button" variant="outline" className="h-11" onClick={() => setAbierto(false)} disabled={enviando}>
              {t('volver')}
            </Button>
            {opciones.length > 0 && (
              <Button type="submit" className="h-11" loading={enviando}>
                {t('aprobarEnviar')}
              </Button>
            )}
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
