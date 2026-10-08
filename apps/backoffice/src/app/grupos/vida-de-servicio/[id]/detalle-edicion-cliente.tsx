'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { CalendarCog, CircleAlert, CircleCheckBig, CircleX, LockKeyhole, LockKeyholeOpen, Phone, Plus, TriangleAlert, UserMinus } from 'lucide-react';
import {
  MOTIVO_MAX,
  SEMANAS_MAX,
  ApiError,
  apiFetch,
  erroresPorCampo,
  formatearDiaEnArgentina,
  sumarDias,
  type EdicionAdminDetalle,
  type TipoBaja,
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
  ConfirmDestructiveDialog,
  DialogoTextoOpcional,
  EstadoSemana,
  MensajeErrorCampo,
  MigaDePan,
  ResumenErrores,
  useEnvio,
} from '@vida-sobrenatural/ui';

type Traducir = ReturnType<typeof useTranslations>;

/**
 * spec 008 — el detalle de una edición (FR-038): Líderes (vigentes e
 * historial), cronograma con el estado de cada semana, inscriptos con estado
 * y faltas (alerta con texto + ícono), bajas propuestas y cierre. Con
 * `puedeGestionar` (Admin, edición en curso), las acciones: lo reversible con
 * confirmación neutra (abrir/cerrar la inscripción, sacar un Líder, no
 * confirmar una baja o el cierre) y lo irreversible en rojo + ícono (aplicar
 * una baja, confirmar el cierre, D151).
 */
export function DetalleEdicionCliente({
  edicion,
  apiToken,
  puedeGestionar,
  lideresDisponibles,
}: {
  edicion: EdicionAdminDetalle;
  apiToken: string;
  puedeGestionar: boolean;
  lideresDisponibles: Array<{ id: string; nombre: string; apellido: string }>;
}) {
  const t = useTranslations('edicionesServicio.detalle');
  const tg = useTranslations('grupos');
  const tm = useTranslations('edicionesServicio.material');
  const te = useTranslations('errors');
  const locale = useLocale();
  const router = useRouter();
  const fecha = (iso: string) => formatearDiaEnArgentina(iso, locale);
  const e = edicion;
  const base = `/grupos/vida-de-servicio/${e.grupoId}`;

  async function llamar(metodo: 'POST' | 'PUT' | 'DELETE', ruta: string, body?: unknown) {
    return apiFetch<EdicionAdminDetalle>(`${base}${ruta}`, {
      method: metodo,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  function avisarError(error: unknown) {
    if (error instanceof ApiError && error.code === 'BAJAS_PROPUESTAS_SIN_RESOLVER') {
      const bajas = (error.extensiones?.bajas as Array<{ persona?: { nombre: string; apellido: string } }> | undefined) ?? [];
      toast.error(t('bajasSinResolver', { nombres: bajas.map((b) => `${b.persona?.nombre ?? ''} ${b.persona?.apellido ?? ''}`.trim()).join(', ') }));
    } else {
      const code = error instanceof ApiError ? error.code : null;
      toast.error(code && te.has(code) ? te(code) : t('errorGenerico'));
    }
    router.refresh();
  }

  /** Una acción con su mensaje de éxito; refresca al terminar. */
  function accion(fn: () => Promise<unknown>, exito: string) {
    return async () => {
      try {
        await fn();
        toast.success(exito);
      } catch (error) {
        avisarError(error);
        return;
      }
      router.refresh();
    };
  }

  const inscripcion = useEnvio(accion(() => llamar('PUT', '/inscripcion-abierta', { abierta: !e.inscripcionAbierta }), t('inscripcionActualizada')));
  const cierre = useEnvio(accion(() => llamar('POST', '/finalizacion/confirmar'), t('cierreConfirmado')));
  const estadosSemana = {
    liberada: tm('estados.liberada'),
    proxima: tm('estados.proxima'),
    sin_material: tm('estados.sin_material'),
    cargado_por_liberar: tm('estados.cargado_por_liberar'),
    vencida_sin_material: tm('estados.vencida_sin_material'),
  };
  const nombrePersona = (p: { nombre: string; apellido: string }) => `${p.nombre} ${p.apellido}`;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-16">
      <MigaDePan tramos={[{ label: tg('titulo'), href: '/grupos?curso=vida_de_servicio' }, { label: e.nombre }]} LinkComponente={Link} />

      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold break-words">{t('titulo', { nombre: e.nombre })}</h1>
        <p className="text-muted-foreground">{t('info', { sede: e.sede, fecha: fecha(e.fechaInicio) })}</p>
        <p className="flex items-center gap-1.5 font-medium">
          {e.estado === 'en_curso' ? <CircleAlert aria-hidden className="size-4 text-primary" /> : <CircleCheckBig aria-hidden className="size-4" />}
          {t(`estado.${e.estado}`)}
        </p>
        {e.estado === 'en_curso' && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <p className="flex items-center gap-1.5">
              {e.inscripcionAbierta ? <LockKeyholeOpen aria-hidden className="size-4" /> : <LockKeyhole aria-hidden className="size-4" />}
              {e.inscripcionAbierta ? t('inscripcionAbierta') : t('inscripcionCerrada')}
            </p>
            {puedeGestionar && (
              <Button type="button" variant="outline" className="h-11 w-fit" loading={inscripcion.enviando} onClick={() => void inscripcion.ejecutar()}>
                {e.inscripcionAbierta ? t('cerrarInscripcion') : t('abrirInscripcion')}
              </Button>
            )}
          </div>
        )}
      </header>

      <Seccion id="lideres" titulo={t('lideresTitulo')}>
        <ul className="flex flex-col gap-2">
          {e.lideres.map((l) => (
            <li key={l.personaId} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3">
              <Link href={`/personas/${l.personaId}`} className="font-medium underline underline-offset-2">
                {nombrePersona(l)}
              </Link>
              {puedeGestionar && e.lideres.length > 1 && (
                <SacarLider nombre={nombrePersona(l)} onConfirmar={accion(() => llamar('DELETE', `/lideres/${l.personaId}`), t('liderSacado', { nombre: nombrePersona(l) }))} t={t} />
              )}
            </li>
          ))}
        </ul>
        {puedeGestionar && (
          <SumarLider
            edicion={e.nombre}
            opciones={lideresDisponibles.filter((p) => !e.lideres.some((l) => l.personaId === p.id))}
            onSumar={async (personaId, nombre) => accion(() => llamar('POST', '/lideres', { personaId }), t('liderSumado', { nombre }))()}
            t={t}
          />
        )}
        {e.historialLideres.some((h) => h.hasta) && (
          <details className="text-sm">
            <summary className="min-h-11 cursor-pointer py-2 font-medium">{t('historialLideres')}</summary>
            <ul className="flex flex-col gap-1 text-muted-foreground">
              {e.historialLideres.map((h, i) => (
                <li key={`${h.personaId}-${i}`}>
                  {h.hasta
                    ? t('liderDesdeHasta', { nombre: nombrePersona(h), desde: fecha(h.desde), hasta: fecha(h.hasta) })
                    : t('liderDesde', { nombre: nombrePersona(h), desde: fecha(h.desde) })}
                </li>
              ))}
            </ul>
          </details>
        )}
      </Seccion>

      <Seccion id="cronograma" titulo={t('cronogramaTitulo')}>
        <ol className="grid gap-2 sm:grid-cols-2">
          {e.semanas.map((s) => (
            <li key={s.numero} className="flex flex-col gap-1 rounded-md border border-border p-3">
              <span className="font-medium">{t('semana', { numero: s.numero })}</span>
              <span className="text-sm text-muted-foreground">{t('fecha', { fecha: fecha(s.fechaLiberacion) })}</span>
              <EstadoSemana estado={s.estado} textos={estadosSemana} className="text-sm" />
              {(s.estado === 'liberada' || s.estado === 'cargado_por_liberar') && (
                <Link href={`${base}/semanas/${s.numero}`} className="inline-flex min-h-11 items-center text-sm underline underline-offset-2">
                  {t('verMaterial', { numero: s.numero })}
                </Link>
              )}
            </li>
          ))}
        </ol>
        {puedeGestionar && <EditarCronograma semanas={e.semanas} onGuardar={(semanas) => llamar('PUT', '/cronograma', { semanas })} t={t} te={te} />}
      </Seccion>

      {e.bajasPropuestas.length > 0 && (
        <Seccion id="bajas" titulo={t('bajasTitulo')}>
          <ul className="flex flex-col gap-3">
            {e.bajasPropuestas.map((b) => {
              const nombre = nombrePersona(b.persona);
              return (
                <li key={b.inscripcionId} className="flex flex-col gap-2 rounded-md border border-border p-3">
                  <p className="font-medium">{nombre}</p>
                  <p className="text-sm text-muted-foreground">
                    {t('bajaPropuesta', { lider: b.propuestaPor ? nombrePersona(b.propuestaPor) : '—', fecha: fecha(b.en), tipo: t(`tipos.${b.tipo}`) })}
                  </p>
                  {b.comentario && <p className="text-sm break-words">{t('bajaComentario', { comentario: b.comentario })}</p>}
                  {puedeGestionar && (
                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                      <DialogoTextoOpcional
                        trigger={
                          <Button type="button" variant="outline" className="h-11">
                            <CircleX aria-hidden />
                            {t('rechazarBaja')}
                          </Button>
                        }
                        titulo={t('rechazarBajaTitulo', { nombre })}
                        descripcion={t('rechazarBajaDescripcion', { nombre })}
                        campo="motivo"
                        etiqueta={t('motivoEtiqueta')}
                        ayuda={t('motivoAyuda')}
                        max={MOTIVO_MAX}
                        contador={(cantidad, maximo) => t('contador', { cantidad, maximo })}
                        mensajeDemasiadoLargo={te('campos.MOTIVO_DEMASIADO_LARGO')}
                        tituloResumen={t('resumenErrores')}
                        textoEnviar={t('rechazarBajaEnviar')}
                        textoVolver={t('volver')}
                        onEnviar={async (motivo) => {
                          try {
                            await llamar('POST', `/inscripciones/${b.inscripcionId}/baja/rechazar`, { motivo: motivo ?? undefined });
                            toast.success(t('bajaRechazada', { nombre }));
                          } catch (error) {
                            if (erroresPorCampo(error)) return { errorCampo: te('campos.MOTIVO_DEMASIADO_LARGO') };
                            avisarError(error);
                            return;
                          }
                          router.refresh();
                        }}
                      />
                      <DialogoBaja
                        nombre={nombre}
                        tipoInicial={b.tipo}
                        boton={t('confirmarBaja', { nombre })}
                        titulo={t('confirmarBajaTitulo', { nombre })}
                        descripcion={t('confirmarBajaDescripcion', { nombre })}
                        enviar={t('confirmarBajaEnviar')}
                        onConfirmar={(tipo) => accion(() => llamar('POST', `/inscripciones/${b.inscripcionId}/baja/confirmar`, { tipo }), t('bajaConfirmada', { nombre }))()}
                        t={t}
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </Seccion>
      )}

      <Seccion id="inscriptos" titulo={t('inscriptosTitulo')}>
        {e.inscriptos.length === 0 ? (
          <p className="text-muted-foreground">{t('sinInscriptos')}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {e.inscriptos.map((i) => {
              const nombre = nombrePersona(i);
              return (
                <li key={i.inscripcionId} className="flex flex-col gap-1 rounded-md border border-border p-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <Link href={`/personas/${i.personaId}`} className="font-medium underline underline-offset-2">
                      {nombre}
                    </Link>
                    <span className="text-sm text-muted-foreground">{t(`estadoInscripcion.${i.estado}`)}</span>
                  </div>
                  {i.alertaFaltas ? (
                    <span className="flex items-center gap-1.5 text-sm font-medium">
                      <CircleAlert aria-hidden className="size-4 text-primary" />
                      {t('alertaFaltas', { cantidad: i.faltas })}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">{t('faltas', { cantidad: i.faltas })}</span>
                  )}
                  {i.telefono && (
                    <a href={`tel:${i.telefono}`} className="inline-flex min-h-11 w-fit items-center gap-1.5 text-sm underline underline-offset-2">
                      <Phone aria-hidden className="size-4" />
                      {i.telefono}
                    </a>
                  )}
                  {puedeGestionar && i.estado === 'activa' && !i.bajaPropuesta && (
                    <DialogoBaja
                      nombre={nombre}
                      tipoInicial="dada_de_baja"
                      boton={t('darDeBaja')}
                      titulo={t('darDeBajaTitulo', { nombre })}
                      descripcion={t('darDeBajaDescripcion', { nombre })}
                      enviar={t('darDeBajaEnviar')}
                      onConfirmar={(tipo) => accion(() => llamar('POST', `/inscripciones/${i.inscripcionId}/baja`, { tipo }), t('bajaConfirmada', { nombre }))()}
                      t={t}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Seccion>

      {e.estado === 'en_curso' && (
        <Seccion id="finalizacion" titulo={t('finalizacionTitulo')}>
          {e.finalizacion.propuestaEn ? (
            <p>{t('finalizacionPropuesta', { nombre: e.finalizacionPropuestaPor ? nombrePersona(e.finalizacionPropuestaPor) : '—', fecha: fecha(e.finalizacion.propuestaEn) })}</p>
          ) : (
            <>
              {e.finalizacion.rechazadaEn && <p className="text-muted-foreground">{t('finalizacionRechazada', { fecha: fecha(e.finalizacion.rechazadaEn) })}</p>}
              <p className="text-muted-foreground">{t('finalizacionSinPropuesta')}</p>
            </>
          )}
          {puedeGestionar && e.finalizacion.propuestaEn && (
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <DialogoTextoOpcional
                trigger={
                  <Button type="button" variant="outline" className="h-11">
                    <CircleX aria-hidden />
                    {t('rechazarCierre')}
                  </Button>
                }
                titulo={t('rechazarCierreTitulo', { nombre: e.nombre })}
                descripcion={t('rechazarCierreDescripcion')}
                campo="motivo"
                etiqueta={t('motivoEtiqueta')}
                ayuda={t('motivoAyuda')}
                max={MOTIVO_MAX}
                contador={(cantidad, maximo) => t('contador', { cantidad, maximo })}
                mensajeDemasiadoLargo={te('campos.MOTIVO_DEMASIADO_LARGO')}
                tituloResumen={t('resumenErrores')}
                textoEnviar={t('rechazarCierreEnviar')}
                textoVolver={t('volver')}
                onEnviar={async (motivo) => {
                  try {
                    await llamar('POST', '/finalizacion/rechazar', { motivo: motivo ?? undefined });
                    toast.success(t('cierreRechazado'));
                  } catch (error) {
                    if (erroresPorCampo(error)) return { errorCampo: te('campos.MOTIVO_DEMASIADO_LARGO') };
                    avisarError(error);
                    return;
                  }
                  router.refresh();
                }}
              />
              <ConfirmDestructiveDialog
                tono="destructivo"
                trigger={
                  <Button type="button" variant="destructive" className="h-11" loading={cierre.enviando}>
                    <TriangleAlert aria-hidden />
                    {t('confirmarCierre')}
                  </Button>
                }
                titulo={t('confirmarCierreTitulo', { nombre: e.nombre })}
                descripcion={t('confirmarCierreDescripcion')}
                textoConfirmar={t('confirmarCierreEnviar')}
                textoCancelar={t('volver')}
                onConfirmar={() => void cierre.ejecutar()}
              />
            </div>
          )}
        </Seccion>
      )}
    </div>
  );
}

function Seccion({ id, titulo, children }: { id: string; titulo: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`titulo-${id}`} className="flex flex-col gap-3">
      <h2 id={`titulo-${id}`} className="text-lg font-semibold">
        {titulo}
      </h2>
      {children}
    </section>
  );
}

/** Sacar un Líder: reversible (se lo puede volver a sumar) → neutra (D151). */
function SacarLider({ nombre, onConfirmar, t }: { nombre: string; onConfirmar: () => Promise<void>; t: Traducir }) {
  const { enviando, ejecutar } = useEnvio(onConfirmar);
  return (
    <ConfirmDestructiveDialog
      tono="neutro"
      trigger={
        <Button type="button" variant="outline" className="h-11" loading={enviando}>
          <UserMinus aria-hidden />
          {t('sacarLider', { nombre })}
        </Button>
      }
      titulo={t('sacarLiderTitulo', { nombre })}
      descripcion={t('sacarLiderDescripcion')}
      textoConfirmar={t('sacarLiderConfirmar')}
      textoCancelar={t('volver')}
      onConfirmar={() => void ejecutar()}
    />
  );
}

function SumarLider({
  edicion,
  opciones,
  onSumar,
  t,
}: {
  edicion: string;
  opciones: Array<{ id: string; nombre: string; apellido: string }>;
  onSumar: (personaId: string, nombre: string) => Promise<void>;
  t: Traducir;
}) {
  const [abierto, setAbierto] = useState(false);
  const [elegido, setElegido] = useState('');
  const { enviando, ejecutar } = useEnvio(async () => {
    const p = opciones.find((o) => o.id === elegido);
    if (!p) return;
    await onSumar(p.id, `${p.nombre} ${p.apellido}`);
    setAbierto(false);
    setElegido('');
  });
  if (opciones.length === 0) return null;
  return (
    <AlertDialog open={abierto} onOpenChange={setAbierto}>
      <AlertDialogTrigger
        render={
          <Button type="button" variant="outline" className="h-11 w-fit">
            <Plus aria-hidden />
            {t('sumarLider')}
          </Button>
        }
      />
      <AlertDialogContent data-tono="neutro">
        <form
          className="flex flex-col gap-4"
          onSubmit={(ev) => {
            ev.preventDefault();
            void ejecutar();
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>{t('sumarLiderTitulo', { nombre: edicion })}</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="flex flex-col gap-1">
            <label htmlFor="campo-lider" className="font-medium">
              {t('elegirLider')}
            </label>
            <select id="campo-lider" value={elegido} onChange={(ev) => setElegido(ev.target.value)} className="h-11 rounded-md border border-input bg-background px-3">
              <option value="" />
              {opciones.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nombre} {o.apellido}
                </option>
              ))}
            </select>
          </div>
          <AlertDialogFooter>
            <Button type="button" variant="outline" className="h-11" onClick={() => setAbierto(false)} disabled={enviando}>
              {t('volver')}
            </Button>
            <Button type="submit" className="h-11" loading={enviando} disabled={!elegido}>
              {t('sumar')}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Aplicar una baja (confirmar la propuesta o directa): irreversible → rojo + ícono (D151), con el tipo corregible. */
function DialogoBaja({
  nombre,
  tipoInicial,
  boton,
  titulo,
  descripcion,
  enviar,
  onConfirmar,
  t,
}: {
  nombre: string;
  tipoInicial: TipoBaja;
  boton: string;
  titulo: string;
  descripcion: string;
  enviar: string;
  onConfirmar: (tipo: TipoBaja) => Promise<void>;
  t: Traducir;
}) {
  const [abierto, setAbierto] = useState(false);
  const [tipo, setTipo] = useState<TipoBaja>(tipoInicial);
  const { enviando, ejecutar } = useEnvio(async () => {
    setAbierto(false);
    await onConfirmar(tipo);
  });
  const id = `tipo-baja-${nombre.replace(/\W+/g, '-')}`;
  return (
    <AlertDialog open={abierto} onOpenChange={setAbierto}>
      <AlertDialogTrigger
        render={
          <Button type="button" variant="destructive" className="h-11 w-fit" loading={enviando}>
            <TriangleAlert aria-hidden />
            {boton}
          </Button>
        }
      />
      <AlertDialogContent data-tono="destructivo">
        <form
          className="flex flex-col gap-4"
          onSubmit={(ev) => {
            ev.preventDefault();
            void ejecutar();
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>{titulo}</AlertDialogTitle>
            <AlertDialogDescription>{descripcion}</AlertDialogDescription>
          </AlertDialogHeader>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 font-medium">{t('tipoEtiqueta')}</legend>
            {(['dada_de_baja', 'abandono'] as const).map((valor) => (
              <label key={valor} htmlFor={`${id}-${valor}`} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md border border-border px-3 has-[:checked]:border-primary">
                <input id={`${id}-${valor}`} type="radio" name={id} checked={tipo === valor} onChange={() => setTipo(valor)} className="size-4 accent-primary" />
                {valor === 'dada_de_baja' ? t('tipoDadaDeBaja') : t('tipoAbandono')}
              </label>
            ))}
          </fieldset>
          <AlertDialogFooter>
            <Button type="button" variant="outline" className="h-11" onClick={() => setAbierto(false)}>
              {t('volver')}
            </Button>
            <Button type="submit" variant="destructive" className="h-11">
              {enviar}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * "Cambiar fechas" (FR-004): el cronograma completo, con agregar al final y
 * quitar la última. Las semanas que ya se ven quedan fijas; lo demás lo
 * valida la API y lo muestra en cada fecha (H-50).
 */
function EditarCronograma({
  semanas,
  onGuardar,
  t,
  te,
}: {
  semanas: EdicionAdminDetalle['semanas'];
  onGuardar: (semanas: Array<{ numero: number; fechaLiberacion: string }>) => Promise<unknown>;
  t: Traducir;
  te: Traducir;
}) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [fechas, setFechas] = useState(semanas.map((s) => s.fechaLiberacion));
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [foco, setFoco] = useState(0);
  const fija = (i: number) => semanas[i]?.estado === 'liberada';
  const mensaje = (code: string) => (te.has(`campos.${code}`) ? te(`campos.${code}`) : te.has(code) ? te(code) : t('errorGenerico'));

  const { enviando, ejecutar } = useEnvio(async () => {
    try {
      await onGuardar(fechas.map((f, i) => ({ numero: i + 1, fechaLiberacion: f })));
      toast.success(t('cronogramaGuardado'));
      setAbierto(false);
      router.refresh();
    } catch (error) {
      const campos = erroresPorCampo(error);
      const nuevos = campos ? Object.fromEntries(campos.map((c) => [c.campo, mensaje(c.code)])) : { semanas: mensaje(error instanceof ApiError ? error.code : '') };
      setErrores(nuevos);
      setFoco((f) => f + 1);
    }
  });

  return (
    <AlertDialog
      open={abierto}
      onOpenChange={(o) => {
        setAbierto(o);
        if (o) {
          setFechas(semanas.map((s) => s.fechaLiberacion));
          setErrores({});
        }
      }}
    >
      <AlertDialogTrigger
        render={
          <Button type="button" variant="outline" className="h-11 w-fit">
            <CalendarCog aria-hidden />
            {t('editarCronograma')}
          </Button>
        }
      />
      <AlertDialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl" data-tono="neutro">
        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={(ev) => {
            ev.preventDefault();
            void ejecutar();
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>{t('editarCronogramaTitulo')}</AlertDialogTitle>
            <AlertDialogDescription>{t('editarCronogramaDescripcion')}</AlertDialogDescription>
          </AlertDialogHeader>
          <ResumenErrores errores={Object.entries(errores).map(([campo, m]) => ({ campo, mensaje: m }))} titulo={t('resumenErrores')} foco={foco} />
          <div id="campo-semanas" tabIndex={-1} className="outline-none">
            <MensajeErrorCampo id="error-semanas" mensaje={errores.semanas} />
          </div>
          <ol className="grid gap-2 sm:grid-cols-2">
            {fechas.map((f, i) => (
              <li key={i} className="flex flex-col gap-1">
                <label htmlFor={`campo-semanas.${i}`} className="text-sm">
                  {t('semana', { numero: i + 1 })}
                </label>
                <input
                  id={`campo-semanas.${i}`}
                  type="date"
                  value={f}
                  disabled={fija(i)}
                  onChange={(ev) => setFechas((xs) => xs.map((x, j) => (j === i ? ev.target.value : x)))}
                  aria-invalid={errores[`semanas.${i}`] ? true : undefined}
                  aria-describedby={errores[`semanas.${i}`] ? `error-semanas.${i}` : undefined}
                  className="h-11 rounded-md border border-input bg-background px-3 disabled:opacity-70"
                />
                <MensajeErrorCampo id={`error-semanas.${i}`} mensaje={errores[`semanas.${i}`]} />
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap gap-2">
            {fechas.length < SEMANAS_MAX && (
              <Button type="button" variant="outline" className="h-11" onClick={() => setFechas((xs) => [...xs, sumarDias(xs.at(-1) ?? fechas[0], 7)])}>
                <Plus aria-hidden />
                {t('agregarSemana')}
              </Button>
            )}
            {fechas.length > 1 && !fija(fechas.length - 1) && (
              <Button type="button" variant="outline" className="h-11" onClick={() => setFechas((xs) => xs.slice(0, -1))}>
                <CircleX aria-hidden />
                {t('quitarUltima')}
              </Button>
            )}
          </div>
          <AlertDialogFooter>
            <Button type="button" variant="outline" className="h-11" onClick={() => setAbierto(false)} disabled={enviando}>
              {t('volver')}
            </Button>
            <Button type="submit" className="h-11" loading={enviando}>
              {t('guardarCronograma')}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
