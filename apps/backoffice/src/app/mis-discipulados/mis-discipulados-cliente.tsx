'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { AlertTriangle, CalendarClock, CheckCircle2, CircleCheckBig, Clock, Phone, UsersRound } from 'lucide-react';
import { apiFetch, ApiError, type MiDiscipulado, type PropuestaParaMi } from '@vida-sobrenatural/shared-types';
import { Button, ButtonLink, ConfirmDestructiveDialog, EstadoVacio, useEnvio } from '@vida-sobrenatural/ui';
import { fechaParaLeer, mensajeDeError, mensajesDeCampo, nombresDe, textoFranja, type MisDiscipuladosRespuesta } from './comun';
import { PanelMotivo } from './panel-motivo';
import { PedirEnNombreDe } from '../../components/pedir-en-nombre-de';

/**
 * specs/004, T037e y T046 (FR-037, FR-046, FR-047): la lista del
 * Discipulador. Primero lo que hay que responder (las propuestas), como
 * tarjetas — es celular, no tabla —; después sus discipulados. Sin agenda,
 * arriba de todo el aviso de FR-047 con el enlace a Mi disponibilidad.
 * Arriba de la lista, "Pedir Vida Nueva en nombre de…" (FR-002, T046), con el
 * mismo componente que la bandeja de Solicitudes.
 */
export function MisDiscipuladosCliente({
  datos,
  apiToken,
  puedeGestionar,
  puedeCrearEnNombre,
}: {
  datos: MisDiscipuladosRespuesta;
  apiToken: string;
  puedeGestionar: boolean;
  puedeCrearEnNombre: boolean;
}) {
  const t = useTranslations('misDiscipulados');
  const router = useRouter();
  const { propuestas, discipulados, tieneAgenda } = datos;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">{t('titulo')}</h1>
        <p className="text-muted-foreground">{t('descripcion')}</p>
        {puedeCrearEnNombre && <PedirEnNombreDe apiToken={apiToken} onCreado={() => router.refresh()} />}
      </header>

      {!tieneAgenda && (
        <section aria-labelledby="sin-agenda" className="flex flex-col gap-3 rounded-lg border border-border p-4">
          <h2 id="sin-agenda" className="flex items-center gap-2 font-semibold">
            <CalendarClock className="size-5 shrink-0" aria-hidden="true" />
            {t('sinAgenda.titulo')}
          </h2>
          <p className="text-muted-foreground">{t('sinAgenda.texto')}</p>
          <ButtonLink size="xl" className="w-full sm:w-fit" render={<Link href="/mi-disponibilidad" />}>
            {t('sinAgenda.accion')}
          </ButtonLink>
        </section>
      )}

      {propuestas.length > 0 && (
        <section aria-labelledby="propuestas" className="flex flex-col gap-3">
          <h2 id="propuestas" className="text-lg font-semibold">
            {t('propuestas.titulo')}
          </h2>
          <p className="text-sm text-muted-foreground">{t('propuestas.descripcion')}</p>
          <ul className="flex flex-col gap-4">
            {propuestas.map((p) => (
              <TarjetaPropuesta key={p.propuestaId} propuesta={p} apiToken={apiToken} puedeGestionar={puedeGestionar} />
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="discipulados" className="flex flex-col gap-3">
        <h2 id="discipulados" className="text-lg font-semibold">
          {t('discipulados.titulo')}
        </h2>
        {discipulados.length === 0 ? (
          <EstadoVacio mensaje={t('discipulados.vacio')} />
        ) : (
          <ul className="flex flex-col gap-4">
            {discipulados.map((d) => (
              <TarjetaDiscipulado key={d.grupoId} discipulado={d} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function TarjetaPropuesta({ propuesta, apiToken, puedeGestionar }: { propuesta: PropuestaParaMi; apiToken: string; puedeGestionar: boolean }) {
  const t = useTranslations('misDiscipulados');
  const tf = useTranslations('franjas');
  const tc = useTranslations('comun');
  const locale = useLocale();
  const router = useRouter();
  const [declinando, setDeclinando] = useState(false);
  const dias = tf.raw('dias') as string[];
  const nombre = `${propuesta.persona.nombre} ${propuesta.persona.apellido}`;
  const idTitulo = `propuesta-${propuesta.propuestaId}`;

  const { enviando: aceptando, ejecutar: aceptar } = useEnvio(async () => {
    try {
      await apiFetch(`/discipulado/propuestas/${propuesta.propuestaId}/aceptar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiToken}` },
      });
      toast(t('propuestas.exitoAceptada', { nombre }));
    } catch (e) {
      toast.error(mensajeDeError(e, t));
    }
    // En los dos casos: la lista cambió (aceptada, o ya no vigente).
    router.refresh();
  });

  async function declinar(motivo: string): Promise<Record<string, string> | null> {
    try {
      await apiFetch(`/discipulado/propuestas/${propuesta.propuestaId}/declinar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` },
        body: JSON.stringify(motivo ? { motivo } : {}),
      });
      toast(t('propuestas.exitoDeclinada'));
    } catch (e) {
      const campos = mensajesDeCampo(e, t);
      if (campos) return campos;
      toast.error(mensajeDeError(e, t));
      if (!(e instanceof ApiError) || e.code !== 'PROPUESTA_NO_VIGENTE') return null;
    }
    setDeclinando(false);
    router.refresh();
    return null;
  }

  const personasDelGrupo = propuesta.grupoDestino?.personas.join(', ') ?? '';

  return (
    <li>
      <article aria-labelledby={idTitulo} className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 text-card-foreground">
        <h3 id={idTitulo} className="text-base font-semibold">
          {nombre} <span className="font-normal text-muted-foreground">· {t('propuestas.edad', { edad: propuesta.persona.edad })}</span>
        </h3>

        {propuesta.tipo === 'reasignacion' ? (
          <div className="flex flex-col gap-1 text-sm">
            <p className="flex items-start gap-2 font-medium">
              <UsersRound className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {t('propuestas.reasignacion', { personas: personasDelGrupo })}
            </p>
            <p className="text-muted-foreground">{t('propuestas.reasignacionAclaracion')}</p>
          </div>
        ) : (
          propuesta.grupoDestino && (
            <p className="flex items-start gap-2 text-sm font-medium">
              <UsersRound className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {t('propuestas.sumarAlGrupo', { personas: personasDelGrupo })}
            </p>
          )
        )}

        <div className="flex flex-col gap-1 text-sm">
          <p className="font-medium">{t('propuestas.franjasEnComun')}</p>
          {propuesta.franjasEnComun.length > 0 ? (
            <ul className="flex flex-col gap-0.5">
              {propuesta.franjasEnComun.map((f) => (
                <li key={`${f.diaSemana}-${f.inicio}-${f.fin}`} className="flex items-center gap-2">
                  <Clock className="size-4 shrink-0" aria-hidden="true" />
                  {textoFranja(f, dias)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">{t('propuestas.sinFranjasEnComun')}</p>
          )}
        </div>

        {/* D81: texto + ícono, nunca solo color. */}
        <p className="flex items-start gap-2 text-sm">
          {propuesta.incumple.length === 0 ? (
            <>
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {t('propuestas.cumpleTodo')}
            </>
          ) : (
            <>
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {t('propuestas.noCumple', { reglas: propuesta.incumple.map((r) => t(`propuestas.reglas.${r}`)).join(', ') })}
            </>
          )}
        </p>

        <p className="text-xs text-muted-foreground">{t('propuestas.propuestaEn', { fecha: fechaParaLeer(propuesta.propuestaEn, locale) })}</p>

        {puedeGestionar && (
          // docs/15, Celular: apiladas a todo el ancho, la principal arriba; en escritorio, a la derecha.
          <div className="flex flex-col gap-2 pt-1 sm:flex-row-reverse sm:justify-start">
            <ConfirmDestructiveDialog
              trigger={
                <Button size="xl" className="w-full sm:w-auto" loading={aceptando} loadingText={t('propuestas.aceptando')}>
                  {t('propuestas.aceptar', { nombre: propuesta.persona.nombre })}
                </Button>
              }
              titulo={t('propuestas.confirmarAceptarTitulo', { nombre })}
              descripcion={t('propuestas.confirmarAceptarTexto')}
              textoConfirmar={t('propuestas.confirmarAceptar')}
              textoCancelar={t('propuestas.volver')}
              onConfirmar={() => void aceptar()}
            />
            <Button size="xl" variant="outline" className="w-full sm:w-auto" disabled={aceptando} onClick={() => setDeclinando(true)}>
              {t('propuestas.declinar')}
            </Button>
          </div>
        )}
      </article>

      <PanelMotivo
        key={declinando ? 'abierto' : 'cerrado'}
        abierto={declinando}
        onCerrar={() => setDeclinando(false)}
        onConfirmar={declinar}
        textos={{
          titulo: t('propuestas.declinarTitulo', { nombre }),
          descripcion: t('propuestas.declinarTexto'),
          etiqueta: t('propuestas.motivo'),
          ayuda: t('propuestas.motivoAyuda'),
          confirmar: t('propuestas.confirmarDeclinar'),
          enviando: t('propuestas.declinando'),
          volver: t('propuestas.volver'),
          cerrarPanel: tc('cerrarPanel'),
          resumen: t('campos.resumen'),
          demasiadoLargo: t('campos.MOTIVO_DEMASIADO_LARGO'),
        }}
      />
    </li>
  );
}

function TarjetaDiscipulado({ discipulado }: { discipulado: MiDiscipulado }) {
  const t = useTranslations('misDiscipulados');
  const locale = useLocale();
  const nombres = nombresDe(discipulado.personas);
  const idTitulo = `discipulado-${discipulado.grupoId}`;
  const enCurso = discipulado.estado === 'en_curso';

  return (
    <li>
      <article aria-labelledby={idTitulo} className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 text-card-foreground">
        <h3 id={idTitulo} className="text-base font-semibold">
          {nombres}
        </h3>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span className="inline-flex items-center gap-1.5">
            {enCurso ? <Clock className="size-4" aria-hidden="true" /> : <CircleCheckBig className="size-4" aria-hidden="true" />}
            {enCurso ? t('discipulados.enCurso') : t('discipulados.finalizado')}
          </span>
          <span className="text-muted-foreground">{t('discipulados.desde', { fecha: fechaParaLeer(discipulado.desde, locale) })}</span>
          {enCurso && <span className="text-muted-foreground">{t('discipulados.lugar', discipulado.lugar)}</span>}
        </p>
        {enCurso && discipulado.propuestaFinalizacionEn && (
          <p className="flex items-start gap-2 text-sm">
            <Clock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {t('discipulados.finalizacionPropuesta')}
          </p>
        )}
        {enCurso && (
          <ul className="flex flex-col gap-1">
            {discipulado.personas.map((p) => (
              <li key={p.inscripcionId}>
                <a
                  href={`tel:${p.contacto.telefono.replace(/\s/g, '')}`}
                  className="inline-flex min-h-11 items-center gap-2 text-sm underline underline-offset-4"
                >
                  <Phone className="size-4 shrink-0" aria-hidden="true" />
                  {t('discipulados.llamar', { nombre: p.nombre, telefono: p.contacto.telefono })}
                </a>
              </li>
            ))}
          </ul>
        )}
        <ButtonLink variant="outline" size="xl" className="w-full sm:w-fit" render={<Link href={`/mis-discipulados/${discipulado.grupoId}`} />}>
          {t('discipulados.ver', { nombres })}
        </ButtonLink>
      </article>
    </li>
  );
}
