'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { GraduationCap, Pencil, Plus, Power, PowerOff, RotateCcw, Trash2, UserMinus, UserRoundCheck } from 'lucide-react';
import {
  ApiError,
  MOTIVO_MAX,
  apiFetch,
  erroresPorCampo,
  formatearDiaEnArgentina,
  formatearFechaHora,
  type CelulaCatalogo,
  type DatosCelula,
  type DatosMinisterio,
  type EliminadoEnPapelera,
  type MiembroMinisterio,
  type MinisterioDetalleCatalogo,
  type Pagina,
} from '@vida-sobrenatural/shared-types';
import {
  Button,
  DialogoTextoOpcional,
  EstadoActivoBadge,
  MigaDePan,
  Paginacion,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@vida-sobrenatural/ui';
import { FormularioCelula, FormularioMinisterio } from '../formularios';
import { DialogoCambiarActivo, DialogoEliminar } from '../dialogos';

type Panel = { tipo: 'ministerio' } | { tipo: 'nuevaCelula' } | { tipo: 'celula'; celula: CelulaCatalogo } | null;

/**
 * spec 009, T042 + T054 (FR-025 a FR-030, FR-032; docs/22): el detalle de un
 * Ministerio. Datos (con su línea pública y si requiere formación), editar,
 * inactivar/reactivar (con el nombre exacto si hay gente, D38) y eliminar
 * (D119); sus áreas con las mismas acciones (una no se reactiva con el
 * Ministerio inactivo, FR-029) y su papelera; y quiénes sirven, paginado, con
 * "Dar de baja" (neutro, motivo opcional interno). El Pastor ve sin acciones.
 */
export function MinisterioDetalleCliente({
  ministerio: m,
  miembros,
  pagina,
  porPagina,
  papeleraCelulas,
  apiToken,
  puedeGestionar,
  puedeVerPapelera,
  abrirAgregarArea,
}: {
  ministerio: MinisterioDetalleCatalogo;
  miembros: Pagina<MiembroMinisterio>;
  pagina: number;
  porPagina: number;
  papeleraCelulas: EliminadoEnPapelera[];
  apiToken: string;
  puedeGestionar: boolean;
  puedeVerPapelera: boolean;
  abrirAgregarArea: boolean;
}) {
  const t = useTranslations('ministerios');
  const tc = useTranslations('comun');
  const te = useTranslations('errors');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const fecha = (iso: string) => formatearFechaHora(iso, locale);
  const [panel, setPanel] = useState<Panel>(abrirAgregarArea && puedeGestionar ? { tipo: 'nuevaCelula' } : null);

  /** Una llamada de escritura; `false` si falló (y ya avisó). Los errores de campo se relanzan para el formulario. */
  async function llamar(ruta: string, metodo: 'POST' | 'PATCH' | 'DELETE', cuerpo?: unknown, relanzarCampos = false): Promise<boolean> {
    try {
      await apiFetch(ruta, {
        method: metodo,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` },
        body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
      });
      return true;
    } catch (error) {
      if (relanzarCampos && erroresPorCampo(error)) throw error;
      const code = error instanceof ApiError ? error.code : null;
      const campo = erroresPorCampo(error)?.[0]?.code;
      toast.error(campo && te.has(`campos.${campo}`) ? te(`campos.${campo}`) : code && te.has(code) ? te(code) : t('errorGenerico'));
      router.refresh();
      return false;
    }
  }

  async function guardarMinisterio(datos: DatosMinisterio) {
    if (await llamar(`/ministerios/${m.id}`, 'PATCH', datos, true)) {
      setPanel(null);
      toast.success(t('guardado'));
      router.refresh();
    }
  }

  async function guardarCelula(datos: DatosCelula, celula?: CelulaCatalogo) {
    const ok = celula ? await llamar(`/celulas/${celula.id}`, 'PATCH', datos, true) : await llamar(`/ministerios/${m.id}/celulas`, 'POST', datos, true);
    if (ok) {
      setPanel(null);
      toast.success(celula ? t('guardado') : t('celulaForm.creada', { nombre: datos.nombre.trim() }));
      router.refresh();
    }
  }

  async function cambiarActivo(ruta: string, nombre: string, activo: boolean, confirmacionNombre?: string) {
    const ok = await llamar(ruta, 'PATCH', { activo: !activo, confirmacionNombre });
    if (ok) {
      toast.success(activo ? t('inactivado', { nombre }) : t('reactivado', { nombre }));
      router.refresh();
    }
    return ok;
  }

  const totalPaginas = Math.max(1, Math.ceil(miembros.total / porPagina));

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-16">
      <MigaDePan
        tramos={[{ label: t('catalogos'), href: '/catalogos' }, { label: t('titulo'), href: '/ministerios' }, { label: m.nombre }]}
        LinkComponente={Link}
      />

      <section aria-labelledby="ministerio-titulo" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 id="ministerio-titulo" className="text-2xl font-semibold break-words">
            {m.nombre}
          </h1>
          <EstadoActivoBadge activo={m.activo} textoActivo={t('detalle.estadoActivo')} textoInactivo={t('detalle.estadoInactivo')} />
        </div>
        <p className="whitespace-pre-line break-words">{m.descripcion}</p>
        <p className="text-sm text-muted-foreground">{m.lineaPublica ? t('detalle.lineaPublica', { linea: m.lineaPublica }) : t('detalle.sinLineaPublica')}</p>
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          {m.requiereFormacion && <GraduationCap aria-hidden className="size-4" />}
          {m.requiereFormacion ? t('detalle.requiereFormacion') : t('detalle.noRequiereFormacion')}
        </p>
        {puedeGestionar ? (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setPanel({ tipo: 'ministerio' })}>
              <Pencil aria-hidden />
              {t('editar')}
            </Button>
            <DialogoCambiarActivo
              trigger={
                <Button variant="outline" size="sm">
                  {m.activo ? <PowerOff aria-hidden /> : <Power aria-hidden />}
                  {m.activo ? t('inactivar') : t('reactivar')}
                </Button>
              }
              nombre={m.nombre}
              activo={m.activo}
              miembros={m.miembrosActivos}
              pendientes={m.postulacionesPendientes}
              onConfirmar={(confirmacion) => cambiarActivo(`/ministerios/${m.id}`, m.nombre, m.activo, confirmacion)}
            />
            <DialogoEliminar
              trigger={
                <Button variant="ghost" size="sm" className={m.tieneDatosRelacionados ? undefined : 'text-destructive hover:text-destructive'}>
                  <Trash2 aria-hidden />
                  {t('eliminar')}
                </Button>
              }
              nombre={m.nombre}
              bloqueado={m.tieneDatosRelacionados}
              motivoBloqueo={t('noSeEliminaMinisterio')}
              onConfirmar={async () => {
                const ok = await llamar(`/ministerios/${m.id}`, 'DELETE');
                if (ok) {
                  toast.success(t('eliminado', { nombre: m.nombre }));
                  router.push('/ministerios');
                }
                return ok;
              }}
            />
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t('soloLectura')}</p>
        )}
      </section>

      <section aria-labelledby="areas-titulo" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="areas-titulo" className="text-lg font-semibold">
            {t('detalle.celulasTitulo')}
          </h2>
          {puedeGestionar && (
            <Button size="sm" onClick={() => setPanel({ tipo: 'nuevaCelula' })}>
              <Plus aria-hidden />
              {t('detalle.agregarCelula')}
            </Button>
          )}
        </div>
        {m.celulas.length === 0 ? (
          <p className="text-muted-foreground">{t('detalle.sinCelulas')}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {m.celulas.map((c) => (
              <li key={c.id} className="flex flex-col gap-2 rounded-md border border-border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium break-words">{c.nombre}</span>
                  <EstadoActivoBadge activo={c.activo} textoActivo={t('detalle.estadoActivo')} textoInactivo={t('detalle.estadoInactivo')} />
                </div>
                {c.descripcion && <p className="text-sm break-words text-muted-foreground">{c.descripcion}</p>}
                <p className="text-sm text-muted-foreground">
                  {t('detalle.celulaMiembros', { cantidad: c.miembrosActivos })}
                  {c.ofreceRolDiscipulador && (
                    <span className="ml-2 inline-flex items-center gap-1">
                      <UserRoundCheck aria-hidden className="size-3.5" />
                      {t('detalle.ofreceRol')}
                    </span>
                  )}
                </p>
                {puedeGestionar && (
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPanel({ tipo: 'celula', celula: c })} aria-label={`${t('editar')} ${c.nombre}`}>
                      <Pencil aria-hidden />
                      {t('editar')}
                    </Button>
                    {!c.activo && !m.activo ? (
                      <p className="text-sm text-muted-foreground">{t('detalle.celulaReactivarBloqueada')}</p>
                    ) : (
                      <DialogoCambiarActivo
                        trigger={
                          <Button variant="outline" size="sm" aria-label={`${c.activo ? t('inactivar') : t('reactivar')} ${c.nombre}`}>
                            {c.activo ? <PowerOff aria-hidden /> : <Power aria-hidden />}
                            {c.activo ? t('inactivar') : t('reactivar')}
                          </Button>
                        }
                        nombre={c.nombre}
                        activo={c.activo}
                        miembros={c.miembrosActivos}
                        pendientes={c.postulacionesPendientes}
                        onConfirmar={(confirmacion) => cambiarActivo(`/celulas/${c.id}`, c.nombre, c.activo, confirmacion)}
                      />
                    )}
                    <DialogoEliminar
                      trigger={
                        <Button variant="ghost" size="sm" aria-label={`${t('eliminar')} ${c.nombre}`} className={c.tieneDatosRelacionados ? undefined : 'text-destructive hover:text-destructive'}>
                          <Trash2 aria-hidden />
                          {t('eliminar')}
                        </Button>
                      }
                      nombre={c.nombre}
                      bloqueado={c.tieneDatosRelacionados}
                      motivoBloqueo={t('noSeEliminaCelula')}
                      onConfirmar={async () => {
                        const ok = await llamar(`/celulas/${c.id}`, 'DELETE');
                        if (ok) {
                          toast.success(t('eliminado', { nombre: c.nombre }));
                          router.refresh();
                        }
                        return ok;
                      }}
                    />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        {puedeVerPapelera && (
          <details className="text-sm">
            <summary className="cursor-pointer font-medium">{t('detalle.papeleraCelulas')}</summary>
            {papeleraCelulas.length === 0 ? (
              <p className="mt-2 text-muted-foreground">{t('detalle.sinPapeleraCelulas')}</p>
            ) : (
              <ul className="mt-2 flex flex-col gap-2">
                {papeleraCelulas.map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center justify-between gap-2">
                    <span>
                      {c.nombre} ·{' '}
                      {c.eliminadoPor
                        ? t('papeleraPagina.eliminadoPor', { fecha: fecha(c.eliminadoEn), nombre: `${c.eliminadoPor.nombre} ${c.eliminadoPor.apellido}` })
                        : t('papeleraPagina.eliminadoEl', { fecha: fecha(c.eliminadoEn) })}
                    </span>
                    {puedeGestionar && (
                      <Button
                        variant="outline"
                        size="sm"
                        aria-label={`${t('papeleraPagina.restaurar')} ${c.nombre}`}
                        onClick={async () => {
                          if (await llamar(`/celulas/${c.id}/restaurar`, 'POST')) {
                            toast.success(t('restaurado', { nombre: c.nombre }));
                            router.refresh();
                          }
                        }}
                      >
                        <RotateCcw aria-hidden />
                        {t('papeleraPagina.restaurar')}
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </details>
        )}
      </section>

      <section aria-labelledby="miembros-titulo" className="flex flex-col gap-3">
        <h2 id="miembros-titulo" className="text-lg font-semibold">
          {t('detalle.miembrosTitulo')} ({miembros.total})
        </h2>
        {miembros.items.length === 0 ? (
          <p className="text-muted-foreground">{t('detalle.sinMiembros')}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
            {miembros.items.map((mi) => {
              const nombre = `${mi.persona.nombre} ${mi.persona.apellido}`;
              return (
                <li key={mi.postulacionId} className="flex flex-wrap items-center justify-between gap-2 p-3">
                  <span className="flex min-w-0 flex-col">
                    <span className="font-medium break-words">{nombre}</span>
                    <span className="text-sm text-muted-foreground">
                      {mi.celula ? mi.celula.nombre : t('detalle.sinArea')} · {t('detalle.miembroDesde', { fecha: formatearDiaEnArgentina(mi.desde, locale) })}
                    </span>
                  </span>
                  {puedeGestionar && (
                    <DialogoTextoOpcional
                      tono="neutro"
                      trigger={
                        <Button variant="outline" size="sm" aria-label={`${t('detalle.darDeBaja')}: ${nombre}`}>
                          <UserMinus aria-hidden />
                          {t('detalle.darDeBaja')}
                        </Button>
                      }
                      titulo={t('detalle.darDeBajaTitulo', { nombre, ministerio: m.nombre })}
                      descripcion={t('detalle.darDeBajaDescripcion')}
                      campo="motivo"
                      etiqueta={t('detalle.darDeBajaMotivo')}
                      max={MOTIVO_MAX}
                      contador={(cantidad, maximo) => t('form.contador', { cantidad, maximo })}
                      mensajeDemasiadoLargo={te('campos.MOTIVO_DEMASIADO_LARGO')}
                      tituloResumen={t('form.resumenErrores')}
                      textoEnviar={t('detalle.darDeBajaEnviar')}
                      textoVolver={t('cancelar')}
                      onEnviar={async (motivo) => {
                        try {
                          await apiFetch(`/postulaciones/${mi.postulacionId}/dar-de-baja`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` },
                            body: JSON.stringify({ motivo: motivo ?? undefined }),
                          });
                        } catch (error) {
                          if (erroresPorCampo(error)) return { errorCampo: te('campos.MOTIVO_DEMASIADO_LARGO') };
                          const code = error instanceof ApiError ? error.code : null;
                          toast.error(code && te.has(code) ? te(code) : t('errorGenerico'));
                          router.refresh();
                          return;
                        }
                        toast.success(t('detalle.dadoDeBaja', { nombre, ministerio: m.nombre }));
                        router.refresh();
                      }}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {totalPaginas > 1 && (
          <Paginacion
            paginaActual={pagina}
            totalPaginas={totalPaginas}
            renderEnlace={(p) => <Link href={p === 1 ? pathname : `${pathname}?pagina=${p}`} />}
            etiquetaAnterior={t('detalle.anterior')}
            etiquetaSiguiente={t('detalle.siguiente')}
          />
        )}
      </section>

      <Sheet open={panel !== null} onOpenChange={(v) => !v && setPanel(null)}>
        <SheetContent side="right" etiquetaCerrar={tc('cerrarPanel')}>
          <SheetHeader>
            <SheetTitle>
              {panel?.tipo === 'ministerio'
                ? `${t('editar')} ${m.nombre}`
                : panel?.tipo === 'celula'
                  ? t('celulaForm.tituloEditar', { nombre: panel.celula.nombre })
                  : t('celulaForm.tituloCrear', { ministerio: m.nombre })}
            </SheetTitle>
            <SheetDescription>{m.nombre}</SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
            {panel?.tipo === 'ministerio' && (
              <FormularioMinisterio
                inicial={{ nombre: m.nombre, descripcion: m.descripcion, lineaPublica: m.lineaPublica, requiereFormacion: m.requiereFormacion }}
                textoEnviar={t('form.guardar')}
                enviar={guardarMinisterio}
                onCancelar={() => setPanel(null)}
              />
            )}
            {panel?.tipo === 'nuevaCelula' && (
              <FormularioCelula inicial={{ nombre: '' }} textoEnviar={t('celulaForm.crear')} enviar={(d) => guardarCelula(d)} onCancelar={() => setPanel(null)} />
            )}
            {panel?.tipo === 'celula' && (
              <FormularioCelula
                key={panel.celula.id}
                inicial={{ nombre: panel.celula.nombre, descripcion: panel.celula.descripcion, ofreceRolDiscipulador: panel.celula.ofreceRolDiscipulador }}
                textoEnviar={t('celulaForm.guardar')}
                enviar={(d) => guardarCelula(d, panel.celula)}
                onCancelar={() => setPanel(null)}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
