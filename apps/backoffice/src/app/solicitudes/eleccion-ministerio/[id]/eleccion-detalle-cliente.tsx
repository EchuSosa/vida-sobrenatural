'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { CircleCheck, CircleMinus, GraduationCap, Hourglass, House, Lock, Phone, UserRound, UsersRound } from 'lucide-react';
import {
  ApiError,
  ELECCION_MOTIVO_MAX,
  MAX_MINISTERIOS_POR_PERSONA,
  apiFetch,
  erroresPorCampo,
  formatearFechaHora,
  type DetalleDecisionMembresia,
  type DetalleEleccionAdmin,
  type MembresiaActual,
  type OpcionVistaAdmin,
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

/**
 * spec 015 (D242): el detalle de una elección de ministerio. Arriba la persona
 * y lo que ya sabemos; después lo que contó, las notas de la charla (privadas,
 * D240) y lo que ya sirve. Cada área elegida se resuelve sola: "Confirmar"
 * crea la membresía (si ya sirve en el mismo carril, el diálogo pregunta si la
 * suma o cuál reemplaza, D241, y la API lo exige) y "No por ahora" la descarta
 * con un motivo interno opcional. Confirmar pide que haya terminado Vida de
 * Servicio. Estados en texto + ícono (D81).
 */
export function EleccionDetalleCliente({ eleccion: e, apiToken, puedeResolver }: { eleccion: DetalleEleccionAdmin; apiToken: string; puedeResolver: boolean }) {
  const t = useTranslations('elecciones');
  const tb = useTranslations('bandeja');
  const ts = useTranslations('solicitudes');
  const locale = useLocale();
  const nombre = `${e.persona.nombre} ${e.persona.apellido}`;
  const fecha = (iso: string) => formatearFechaHora(iso, locale);
  const actuales = [...e.membresias.principales, ...e.membresias.enParalelo];

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-16">
      <MigaDePan tramos={[{ label: ts('titulo'), href: '/solicitudes' }, { label: nombre }]} LinkComponente={Link} />

      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold break-words">{t('titulo', { nombre })}</h1>
        <p className="text-muted-foreground">
          {t('edicion', { edicion: e.edicion.nombre })} · {t('edad', { edad: e.persona.edad })}
        </p>
        <p className="font-medium">{tb(`estados.eleccion_ministerio.${e.estado}`)}</p>
        {e.cargadaPor && <p className="text-sm text-muted-foreground">{t('cargadaPor', { nombre: `${e.cargadaPor.nombre} ${e.cargadaPor.apellido}` })}</p>}
        {e.charlaPor && e.charlaEn && <p className="text-sm text-muted-foreground">{t('charlaPor', { nombre: `${e.charlaPor.nombre} ${e.charlaPor.apellido}`, fecha: fecha(e.charlaEn) })}</p>}
      </div>

      {e.estado === 'borrador' && (
        <AvisoEstado role="note" icono={<Hourglass className="text-primary" />} titulo={t('faltaCharla')} className="rounded-md border border-border p-4" />
      )}
      {!e.apta && (e.estado === 'charla_hecha' || e.estado === 'borrador') && (
        <AvisoEstado role="note" icono={<GraduationCap className="text-primary" />} titulo={t('noAptaTitulo')} className="rounded-md border border-border p-4">
          {t('noAptaTexto')}
        </AvisoEstado>
      )}

      <section aria-labelledby="conocido-titulo" className="flex flex-col gap-1">
        <h2 id="conocido-titulo" className="text-lg font-semibold">
          {t('conocidoTitulo')}
        </h2>
        <p className="flex gap-2">
          <Phone aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <a href={`tel:${e.persona.telefono}`} className="underline underline-offset-4">
            {e.persona.telefono}
          </a>
        </p>
        {e.persona.email && (
          <p className="flex gap-2 break-all">
            <UserRound aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            {e.persona.email}
          </p>
        )}
        <p className="flex gap-2">
          <House aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          {e.conocido.grupoExtension ? t('grupo', { grupo: e.conocido.grupoExtension.nombre, lideres: e.conocido.grupoExtension.lideres.join(', ') || '—' }) : t('sinGrupo')}
        </p>
        <p className="flex gap-2">
          <UsersRound aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          {actuales.length > 0 ? t('yaSirve', { ministerios: actuales.map((a) => a.ministerio.nombre).join(', ') }) : t('noSirve')}
        </p>
      </section>

      <section aria-labelledby="comentario-titulo" className="flex flex-col gap-1">
        <h2 id="comentario-titulo" className="text-lg font-semibold">
          {t('comentarioTitulo')}
        </h2>
        <p className={e.comentario ? 'whitespace-pre-line break-words' : 'text-muted-foreground'}>{e.comentario ?? t('sinTexto')}</p>
      </section>

      {e.notas !== undefined && (
        <section aria-labelledby="notas-titulo" className="flex flex-col gap-1">
          <h2 id="notas-titulo" className="flex items-center gap-2 text-lg font-semibold">
            <Lock aria-hidden className="size-4 shrink-0" />
            {t('notasTitulo')}
          </h2>
          <p className={e.notas ? 'whitespace-pre-line break-words' : 'text-muted-foreground'}>{e.notas ?? t('sinNotas')}</p>
        </section>
      )}

      <section aria-labelledby="opciones-titulo" className="flex flex-col gap-3">
        <h2 id="opciones-titulo" className="text-lg font-semibold">
          {t('opcionesTitulo')}
        </h2>
        <ul className="flex flex-col gap-3">
          {e.opciones.map((o) => (
            <Opcion key={o.id} eleccion={e} opcion={o} apiToken={apiToken} puedeResolver={puedeResolver} fecha={fecha} />
          ))}
        </ul>
      </section>

      {!puedeResolver && <p className="text-sm text-muted-foreground">{t('soloLectura')}</p>}
    </div>
  );
}

function Opcion({
  eleccion: e,
  opcion: o,
  apiToken,
  puedeResolver,
  fecha,
}: {
  eleccion: DetalleEleccionAdmin;
  opcion: OpcionVistaAdmin;
  apiToken: string;
  puedeResolver: boolean;
  fecha: (iso: string) => string;
}) {
  const t = useTranslations('elecciones');
  const te = useTranslations('errors');
  const router = useRouter();
  const nombreArea = o.celula ? `${o.ministerio.nombre} · ${o.celula.nombre}` : o.ministerio.nombre;
  // D241: lo que ya tiene en el carril de esta área (el de los Ministerios o el paralelo).
  const [carril, setCarril] = useState<MembresiaActual[]>(o.enParalelo ? e.membresias.enParalelo : e.membresias.principales);
  const [puedeSumar, setPuedeSumar] = useState(carril.length < (o.enParalelo ? 1 : MAX_MINISTERIOS_POR_PERSONA));
  const [decision, setDecision] = useState<string>(puedeSumar ? 'sumar' : (carril[0]?.postulacionId ?? 'sumar'));
  const [conRol, setConRol] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const resolvible = puedeResolver && e.estado === 'charla_hecha' && o.resultado === 'pendiente';

  function avisarError(error: unknown) {
    const campos = erroresPorCampo(error);
    const code = campos ? campos[0].code : error instanceof ApiError ? error.code : null;
    const texto = campos ? (te.has(`campos.${code}`) ? te(`campos.${code}`) : t('errorGenerico')) : code && te.has(code) ? te(code) : t('errorGenerico');
    toast.error(texto);
    router.refresh();
  }

  const confirmar = useEnvio(async () => {
    try {
      await apiFetch(`/elecciones-ministerio/${e.id}/opciones/${o.id}/confirmar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` },
        body: JSON.stringify({
          ...(carril.length === 0 ? {} : decision === 'sumar' ? { sumar: true } : { reemplazaId: decision }),
          otorgarRolDiscipulador: o.ofrecerRolDiscipulador && conRol,
        }),
      });
    } catch (error) {
      // D241: cambió lo que tiene mientras tanto → se pregunta de nuevo, con el dato real.
      if (error instanceof ApiError && error.code === 'POSTULACION_REQUIERE_CONFIRMAR_CAMBIO') {
        const detalle = error.extensiones as unknown as DetalleDecisionMembresia | undefined;
        const nuevas = detalle?.ministeriosActuales ?? [];
        setCarril(nuevas);
        setPuedeSumar(detalle?.puedeSumar ?? false);
        setDecision(detalle?.puedeSumar ? 'sumar' : (nuevas[0]?.postulacionId ?? 'sumar'));
        return;
      }
      setAbierto(false);
      avisarError(error);
      return;
    }
    setAbierto(false);
    toast.success(t('confirmada', { area: nombreArea }));
    router.refresh();
  });

  const listaCarril = carril.map((a) => a.ministerio.nombre).join(` ${t('y')} `);

  return (
    <li className="flex flex-col gap-3 rounded-lg border border-border p-4">
      <div className="flex flex-col gap-1">
        <h3 className="font-semibold break-words">{nombreArea}</h3>
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          {o.requiereFormacion && <GraduationCap aria-hidden className="size-4 shrink-0" />}
          {[o.requiereFormacion ? t('requiereFormacion') : null, o.enParalelo ? t('enParalelo') : null, !o.disponible ? t('noDisponible') : null].filter(Boolean).join(' · ') || t('empezarYa')}
        </p>
        <p className="flex items-center gap-1.5 font-medium">
          {o.resultado === 'confirmada' ? <CircleCheck aria-hidden className="size-4 shrink-0 text-primary" /> : o.resultado === 'descartada' ? <CircleMinus aria-hidden className="size-4 shrink-0" /> : <Hourglass aria-hidden className="size-4 shrink-0 text-primary" />}
          {t(`resultado.${o.resultado}`)}
          {o.resueltaPor && o.resueltaEn && <span className="font-normal text-muted-foreground">{` · ${t('resueltaPor', { nombre: `${o.resueltaPor.nombre} ${o.resueltaPor.apellido}`, fecha: fecha(o.resueltaEn) })}`}</span>}
        </p>
        {o.motivoDescarte && <p className="text-sm text-muted-foreground">{t('motivoMostrado', { motivo: o.motivoDescarte })}</p>}
      </div>

      {resolvible && (
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <DialogoTextoOpcional
            tono="neutro"
            trigger={
              <Button type="button" variant="outline" className="h-11" disabled={confirmar.enviando} aria-label={t('descartarAria', { area: nombreArea })}>
                <CircleMinus aria-hidden />
                {t('descartar')}
              </Button>
            }
            titulo={t('descartarTitulo', { area: nombreArea })}
            descripcion={t('descartarDescripcion')}
            campo="motivo"
            etiqueta={t('motivoEtiqueta')}
            ayuda={t('motivoAyuda')}
            max={ELECCION_MOTIVO_MAX}
            contador={(cantidad, maximo) => t('contador', { cantidad, maximo })}
            mensajeDemasiadoLargo={te('campos.MOTIVO_DEMASIADO_LARGO')}
            tituloResumen={t('resumenErrores')}
            textoEnviar={t('descartarEnviar')}
            textoVolver={t('volver')}
            onEnviar={async (motivo) => {
              try {
                await apiFetch(`/elecciones-ministerio/${e.id}/opciones/${o.id}/descartar`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` },
                  body: JSON.stringify({ motivo: motivo ?? undefined }),
                });
                toast.success(t('descartada', { area: nombreArea }));
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
                <Button type="button" className="h-11" loading={confirmar.enviando} disabled={!e.apta || !o.disponible} aria-label={t('confirmarAria', { area: nombreArea })}>
                  <CircleCheck aria-hidden />
                  {t('confirmar')}
                </Button>
              }
            />
            <AlertDialogContent data-tono="neutro">
              <AlertDialogHeader>
                <AlertDialogTitle>{t('confirmarTitulo', { area: nombreArea })}</AlertDialogTitle>
                <AlertDialogDescription>{carril.length > 0 ? t('decisionDescripcion', { actual: listaCarril }) : t('confirmarDescripcion')}</AlertDialogDescription>
              </AlertDialogHeader>
              {carril.length > 0 && (
                <fieldset className="flex flex-col gap-2">
                  <legend className="mb-1 font-medium">{t('decisionLeyenda')}</legend>
                  {puedeSumar && (
                    <label className="flex min-h-11 cursor-pointer items-start gap-3 text-base">
                      <input type="radio" name={`decision-${o.id}`} value="sumar" checked={decision === 'sumar'} onChange={() => setDecision('sumar')} className="mt-1 size-5 shrink-0 accent-primary" />
                      {t('decisionSumar', { actual: listaCarril, nuevo: o.ministerio.nombre })}
                    </label>
                  )}
                  {carril.map((a) => (
                    <label key={a.postulacionId} className="flex min-h-11 cursor-pointer items-start gap-3 text-base">
                      <input
                        type="radio"
                        name={`decision-${o.id}`}
                        value={a.postulacionId}
                        checked={decision === a.postulacionId}
                        onChange={() => setDecision(a.postulacionId)}
                        className="mt-1 size-5 shrink-0 accent-primary"
                      />
                      {t('decisionReemplazar', { actual: a.ministerio.nombre, nuevo: o.ministerio.nombre })}
                    </label>
                  ))}
                </fieldset>
              )}
              {o.ofrecerRolDiscipulador && (
                <label className="flex min-h-11 cursor-pointer items-center gap-3 text-base">
                  <input type="checkbox" checked={conRol} onChange={(ev) => setConRol(ev.target.checked)} className="size-5 shrink-0 accent-primary" />
                  {t('rolDiscipulador')}
                </label>
              )}
              <AlertDialogFooter>
                <AlertDialogCancel>{t('volver')}</AlertDialogCancel>
                <Button type="button" loading={confirmar.enviando} onClick={() => void confirmar.ejecutar()}>
                  {t('confirmarEnviar')}
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
      {puedeResolver && e.estado === 'charla_hecha' && o.resultado === 'pendiente' && !e.apta && <p className="text-sm text-muted-foreground">{t('confirmarCuandoTermine')}</p>}
    </li>
  );
}
