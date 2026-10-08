'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { ArrowRightLeft, CircleCheck, CircleX, GraduationCap } from 'lucide-react';
import {
  ApiError,
  MOTIVO_MAX,
  apiFetch,
  erroresPorCampo,
  formatearFechaHora,
  type PostulacionDetalle,
} from '@vida-sobrenatural/shared-types';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  AvisoEstado,
  Button,
  DialogoTextoOpcional,
  MigaDePan,
  useEnvio,
} from '@vida-sobrenatural/ui';
import { claveEstado } from '../estado';

/**
 * spec 009, T028 (FR-016 a FR-019, FR-021, FR-023; docs/22): el detalle de
 * una Postulación. Muestra la Persona, lo que pidió, la marca de "requiere
 * formación" y, si ya pertenece a otro Ministerio, la advertencia ANTES de
 * actuar (texto + ícono, D81). "Aprobar" es la principal: si hay cambio de
 * Ministerio, el diálogo lo pregunta (y la API lo exige, D173); en
 * "Discipulados Vida Nueva" ofrece el rol `discipulador` en el mismo paso.
 * "Rechazar" pide un motivo opcional interno. Las dos son neutras (D151): se
 * puede volver a postular. Si otro Admin la resolvió, lo dice y recarga.
 */
export function PostulacionDetalleCliente({
  postulacion: p,
  apiToken,
  puedeResolver,
}: {
  postulacion: PostulacionDetalle;
  apiToken: string;
  puedeResolver: boolean;
}) {
  const t = useTranslations('postulaciones');
  const tb = useTranslations('bandeja');
  const te = useTranslations('errors');
  const ts = useTranslations('solicitudes');
  const locale = useLocale();
  const router = useRouter();
  const nombre = `${p.persona.nombre} ${p.persona.apellido}`;
  const ministerio = p.ministerio.nombre;
  const fecha = (iso: string) => formatearFechaHora(iso, locale);
  const [ministerioActual, setMinisterioActual] = useState(p.ministerioActual);
  const [abierto, setAbierto] = useState(false);
  const [conRol, setConRol] = useState(false);

  function avisarError(error: unknown) {
    const code = error instanceof ApiError ? error.code : null;
    toast.error(code && te.has(code) ? te(code) : t('errorGenerico'));
    router.refresh();
  }

  const { enviando: aprobando, ejecutar: aprobar } = useEnvio(async () => {
    try {
      await apiFetch(`/postulaciones/${p.id}/aprobar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` },
        body: JSON.stringify({ confirmarCambio: ministerioActual !== null, otorgarRolDiscipulador: p.ofrecerRolDiscipulador && conRol }),
      });
    } catch (error) {
      // D173: otro Admin la aprobó en otro Ministerio mientras tanto → se pregunta de nuevo, con el dato real.
      if (error instanceof ApiError && error.code === 'POSTULACION_REQUIERE_CONFIRMAR_CAMBIO') {
        setMinisterioActual((error.extensiones?.ministerioActual as PostulacionDetalle['ministerioActual']) ?? null);
        return;
      }
      const campos = erroresPorCampo(error);
      if (campos) {
        toast.error(te.has(`campos.${campos[0].code}`) ? te(`campos.${campos[0].code}`) : t('errorGenerico'));
        router.refresh();
        return;
      }
      setAbierto(false);
      avisarError(error);
      return;
    }
    setAbierto(false);
    toast.success(conRol && p.ofrecerRolDiscipulador ? t('aprobadaConRol', { nombre, ministerio }) : t('aprobada', { nombre, ministerio }));
    router.refresh();
  });

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-16">
      <MigaDePan tramos={[{ label: ts('titulo'), href: '/solicitudes' }, { label: nombre }]} LinkComponente={Link} />

      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold break-words">{t('titulo', { nombre, ministerio })}</h1>
        <p className="text-muted-foreground">
          {t('edad', { edad: p.persona.edad })} · {t('postuloEl', { fecha: fecha(p.createdAt) })}
          {p.persona.sinAccesoALaApp && ` · ${t('sinAccesoALaApp')}`}
        </p>
        <p className="font-medium">{tb(`estados.postulacion.${p.estado}`)}</p>
        {p.creadoPor && <p className="text-sm text-muted-foreground">{t('creadaPor', { nombre: `${p.creadoPor.nombre} ${p.creadoPor.apellido}` })}</p>}
        {p.revisadoPor && p.revisadaEn && (
          <p className="text-sm text-muted-foreground">
            {t('revisadaPor', { nombre: `${p.revisadoPor.nombre} ${p.revisadoPor.apellido}`, fecha: fecha(p.revisadaEn) })}
          </p>
        )}
      </div>

      {p.estado === 'pendiente' && ministerioActual && (
        <AvisoEstado
          role="note"
          icono={<ArrowRightLeft className="text-primary" />}
          titulo={t('yaPerteneceTitulo', { ministerio: ministerioActual.nombre })}
          className="rounded-md border border-border p-4"
        >
          {t('yaPerteneceTexto', { nuevo: ministerio })}
        </AvisoEstado>
      )}
      {p.requiereFormacion && (
        <AvisoEstado role="note" icono={<GraduationCap className="text-primary" />} titulo={t('requiereFormacionTitulo')} className="rounded-md border border-border p-4">
          {t('requiereFormacionTexto')}
        </AvisoEstado>
      )}

      <section aria-labelledby="pidio-titulo" className="flex flex-col gap-2">
        <h2 id="pidio-titulo" className="text-lg font-semibold">
          {t('postulacionTitulo')}
        </h2>
        <p>
          {t('ministerio', { ministerio })} {!p.ministerio.activo && t('pausado')}
        </p>
        <p>
          {p.celula ? t('celula', { celula: p.celula.nombre }) : t('sinPreferencia')} {p.celula && !p.celula.activo && t('pausado')}
        </p>
        <h3 className="mt-2 font-medium">{t('motivacion')}</h3>
        <p className={p.motivacion ? 'whitespace-pre-line break-words' : 'text-muted-foreground'}>{p.motivacion ?? t('sinTexto')}</p>
        <h3 className="mt-2 font-medium">{t('disponibilidad')}</h3>
        <p className={p.disponibilidad ? 'whitespace-pre-line break-words' : 'text-muted-foreground'}>{p.disponibilidad ?? t('sinTexto')}</p>
      </section>

      <section aria-labelledby="contacto-titulo" className="flex flex-col gap-1">
        <h2 id="contacto-titulo" className="text-lg font-semibold">
          {t('contactoTitulo')}
        </h2>
        <p>
          <a href={`tel:${p.persona.telefono}`} className="underline underline-offset-4">
            {t('telefono', { telefono: p.persona.telefono })}
          </a>
        </p>
        {p.persona.email && <p className="break-all">{t('email', { email: p.persona.email })}</p>}
      </section>

      <section aria-labelledby="historial-titulo" className="flex flex-col gap-2">
        <h2 id="historial-titulo" className="text-lg font-semibold">
          {t('historialTitulo')}
        </h2>
        {p.historial.length === 0 ? (
          <p className="text-muted-foreground">{t('sinHistorial')}</p>
        ) : (
          <ul className="flex flex-col gap-1 text-sm">
            {p.historial.map((h) => (
              <li key={h.id}>
                {t('historialFila', { ministerio: h.ministerio.nombre, estado: t(`estado.${claveEstado(h)}`), fecha: fecha(h.resueltaEn ?? h.createdAt) })}
                {h.motivo && <span className="block text-muted-foreground">{t('historialMotivo', { motivo: h.motivo })}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      {p.estado === 'rechazada' && p.motivoRechazo && <p className="text-muted-foreground">{t('motivoRechazoMostrado', { motivo: p.motivoRechazo })}</p>}

      {!puedeResolver && <p className="text-sm text-muted-foreground">{t('soloLectura')}</p>}

      {puedeResolver && p.estado === 'pendiente' && (
        <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
          <DialogoTextoOpcional
            tono="neutro"
            trigger={
              <Button type="button" variant="outline" className="h-11" disabled={aprobando}>
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
                await apiFetch(`/postulaciones/${p.id}/rechazar`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` },
                  body: JSON.stringify({ motivo: motivo ?? undefined }),
                });
                toast.success(t('rechazada', { nombre }));
              } catch (error) {
                if (erroresPorCampo(error)) return { errorCampo: te('campos.MOTIVO_DEMASIADO_LARGO') };
                avisarError(error);
                return;
              }
              router.refresh();
            }}
          />
          <AlertDialog open={abierto} onOpenChange={setAbierto}>
            <AlertDialogTrigger
              render={
                <Button type="button" loading={aprobando} className="h-11">
                  <CircleCheck aria-hidden />
                  {t('aprobar')}
                </Button>
              }
            />
            <AlertDialogContent data-tono="neutro">
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {ministerioActual ? t('cambioTitulo', { actual: ministerioActual.nombre }) : t('aprobarTitulo', { nombre, ministerio })}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {ministerioActual ? t('cambioDescripcion', { actual: ministerioActual.nombre, nuevo: ministerio }) : t('aprobarDescripcion')}
                </AlertDialogDescription>
              </AlertDialogHeader>
              {p.ofrecerRolDiscipulador && (
                <div className="flex flex-col gap-1">
                  <label className="flex min-h-11 cursor-pointer items-center gap-3 text-base">
                    <input
                      type="checkbox"
                      checked={conRol}
                      onChange={(e) => setConRol(e.target.checked)}
                      aria-describedby="rol-discipulador-ayuda"
                      className="size-5 shrink-0 accent-primary"
                    />
                    {t('rolDiscipulador')}
                  </label>
                  <p id="rol-discipulador-ayuda" className="text-sm text-muted-foreground">
                    {t('rolDiscipuladorAyuda')}
                  </p>
                </div>
              )}
              <AlertDialogFooter>
                <AlertDialogCancel>{t('volver')}</AlertDialogCancel>
                <Button type="button" loading={aprobando} onClick={() => void aprobar()}>
                  {ministerioActual ? t('cambioEnviar') : t('aprobarEnviar')}
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  );
}
