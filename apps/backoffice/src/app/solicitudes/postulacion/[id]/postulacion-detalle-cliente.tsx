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
  type DetalleDecisionMembresia,
  type MembresiaActual,
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
 * actuar (texto + ícono, D81). "Aprobar" es la principal: si ya sirve en
 * otro Ministerio, el diálogo pregunta si lo suma (D241, hasta 2) o cuál
 * reemplaza (y la API lo exige, D173); en
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
  // D241: las membresías del mismo carril y si queda lugar para sumar.
  const [actuales, setActuales] = useState<MembresiaActual[]>(p.ministeriosActuales);
  const [puedeSumar, setPuedeSumar] = useState(p.puedeSumar);
  const [eleccion, setEleccion] = useState<string>(p.puedeSumar ? 'sumar' : (p.ministeriosActuales[0]?.postulacionId ?? 'sumar'));
  const listaActuales = textoLista(actuales.map((a) => a.ministerio.nombre), t('y'));
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
        body: JSON.stringify({
          ...(actuales.length === 0 ? {} : eleccion === 'sumar' ? { sumar: true } : { reemplazaId: eleccion }),
          otorgarRolDiscipulador: p.ofrecerRolDiscipulador && conRol,
        }),
      });
    } catch (error) {
      // D173 + D241: cambió lo que tiene (otro Admin aprobó otra mientras tanto) → se pregunta de nuevo, con el dato real.
      if (error instanceof ApiError && error.code === 'POSTULACION_REQUIERE_CONFIRMAR_CAMBIO') {
        const detalle = error.extensiones as unknown as DetalleDecisionMembresia | undefined;
        const nuevas = detalle?.ministeriosActuales ?? [];
        setActuales(nuevas);
        setPuedeSumar(detalle?.puedeSumar ?? false);
        setEleccion(detalle?.puedeSumar ? 'sumar' : (nuevas[0]?.postulacionId ?? 'sumar'));
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

      {p.estado === 'pendiente' && actuales.length > 0 && (
        <AvisoEstado
          role="note"
          icono={<ArrowRightLeft className="text-primary" />}
          titulo={t('yaPerteneceTitulo', { ministerio: listaActuales })}
          className="rounded-md border border-border p-4"
        >
          {puedeSumar ? t('yaPerteneceTextoSumar', { nuevo: ministerio }) : t('yaPerteneceTextoLleno', { nuevo: ministerio })}
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
                <AlertDialogTitle>{t('aprobarTitulo', { nombre, ministerio })}</AlertDialogTitle>
                <AlertDialogDescription>
                  {actuales.length > 0 ? t('decisionDescripcion', { actual: listaActuales }) : t('aprobarDescripcion')}
                </AlertDialogDescription>
              </AlertDialogHeader>
              {actuales.length > 0 && (
                <fieldset className="flex flex-col gap-2">
                  <legend className="mb-1 font-medium">{t('decisionLeyenda')}</legend>
                  {puedeSumar && (
                    <label className="flex min-h-11 cursor-pointer items-start gap-3 text-base">
                      <input
                        type="radio"
                        name="decision-membresia"
                        value="sumar"
                        checked={eleccion === 'sumar'}
                        onChange={() => setEleccion('sumar')}
                        className="mt-1 size-5 shrink-0 accent-primary"
                      />
                      {t('decisionSumar', { actual: listaActuales, nuevo: ministerio })}
                    </label>
                  )}
                  {actuales.map((a) => (
                    <label key={a.postulacionId} className="flex min-h-11 cursor-pointer items-start gap-3 text-base">
                      <input
                        type="radio"
                        name="decision-membresia"
                        value={a.postulacionId}
                        checked={eleccion === a.postulacionId}
                        onChange={() => setEleccion(a.postulacionId)}
                        className="mt-1 size-5 shrink-0 accent-primary"
                      />
                      {t('decisionReemplazar', { actual: a.ministerio.nombre, nuevo: ministerio })}
                    </label>
                  ))}
                  <p className="text-sm text-muted-foreground">{t('decisionAyuda')}</p>
                </fieldset>
              )}
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
                  {actuales.length > 0 && eleccion !== 'sumar' ? t('cambioEnviar') : t('aprobarEnviar')}
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  );
}

/** "A", "A y B". */
function textoLista(nombres: string[], y: string): string {
  return nombres.length <= 1 ? (nombres[0] ?? '') : `${nombres.slice(0, -1).join(', ')} ${y} ${nombres[nombres.length - 1]}`;
}
