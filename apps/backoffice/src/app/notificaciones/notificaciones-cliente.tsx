'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Mail, MonitorSmartphone, Plus } from 'lucide-react';
import {
  formatearFechaHora,
  NOTIFICACIONES_POR_PAGINA,
  type MailFallido,
  type NotificacionManualResumen,
  type Pagina,
} from '@vida-sobrenatural/shared-types';
import { Button, ButtonLink, Paginacion, TablaDatos, type ColumnaTabla } from '@vida-sobrenatural/ui';
import { EnviarAvisoDialogo } from './enviar-aviso-dialogo';

type ConPagina<T> = Pagina<T> & { pagina: number };

/** La etiqueta del alcance de un aviso manual (la usan la tabla y el detalle). */
export function useEtiquetaAlcance() {
  const t = useTranslations('notificaciones.alcance');
  return (a: Pick<NotificacionManualResumen, 'alcance' | 'alcanceNombre'>) => {
    if (a.alcance === 'todos') return t('todos');
    if (!a.alcanceNombre) return t(a.alcance === 'grupo' ? 'grupoSinNombre' : 'ministerioSinNombre');
    return t(a.alcance, { nombre: a.alcanceNombre });
  };
}

/** Nombre corto de un evento automático (solo los importantes tienen mail). */
export function useNombreEvento() {
  const t = useTranslations('notificaciones');
  return (evento: string) => {
    const clave = `eventos.${evento}`;
    return t.has(clave) ? t(clave) : t('eventoDesconocido');
  };
}

/**
 * spec 012, T048 (FR-026, FR-031, FR-032) — la isla del listado: tabla de
 * avisos manuales (Título siempre visible; el resto se oculta por ancho, sin
 * scroll horizontal), "Enviar un aviso" como acción principal solo para quien
 * puede, paginado por URL y la sección de mails que no salieron.
 */
export function NotificacionesCliente({
  avisos,
  fallidos,
  puedeEnviar,
  apiToken,
}: {
  avisos: ConPagina<NotificacionManualResumen>;
  fallidos: ConPagina<MailFallido>;
  puedeEnviar: boolean;
  apiToken: string;
}) {
  const t = useTranslations('notificaciones');
  const locale = useLocale();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const etiquetaAlcance = useEtiquetaAlcance();
  const nombreEvento = useNombreEvento();

  function hrefPagina(clave: 'pagina' | 'fallidos', p: number) {
    const params = new URLSearchParams(searchParams);
    if (p <= 1) params.delete(clave);
    else params.set(clave, String(p));
    const q = params.toString();
    return q ? `${pathname}?${q}` : pathname;
  }
  const totalPaginas = (total: number) => Math.max(1, Math.ceil(total / NOTIFICACIONES_POR_PAGINA));

  const columnas: ColumnaTabla<NotificacionManualResumen>[] = [
    {
      id: 'titulo',
      encabezado: t('columnas.titulo'),
      celda: (n) => (
        <Link href={`/notificaciones/${n.id}`} className="font-medium underline underline-offset-2 hover:no-underline">
          {n.titulo}
        </Link>
      ),
    },
    { id: 'alcance', encabezado: t('columnas.alcance'), className: 'hidden sm:table-cell', celda: (n) => etiquetaAlcance(n) },
    {
      id: 'importante',
      encabezado: t('columnas.importante'),
      className: 'hidden lg:table-cell',
      celda: (n) =>
        n.importante ? (
          <span className="inline-flex items-center gap-1">
            <Mail aria-hidden="true" className="size-4" />
            {t('importanteSi')}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <MonitorSmartphone aria-hidden="true" className="size-4" />
            {t('importanteNo')}
          </span>
        ),
    },
    { id: 'leidas', encabezado: t('columnas.leidas'), className: 'hidden md:table-cell', celda: (n) => t('leidasTexto', { leidas: n.leidas, destinatarios: n.destinatarios }) },
    { id: 'fecha', encabezado: t('columnas.fecha'), className: 'hidden md:table-cell', celda: (n) => formatearFechaHora(n.fecha, locale) },
    { id: 'autor', encabezado: t('columnas.autor'), className: 'hidden xl:table-cell', celda: (n) => `${n.autor.nombre} ${n.autor.apellido}` },
  ];

  const columnasFallidos: ColumnaTabla<MailFallido>[] = [
    {
      id: 'persona',
      encabezado: t('fallidos.columnas.persona'),
      celda: (m) => (
        <Link href={`/personas/${m.persona.id}`} className="font-medium underline underline-offset-2 hover:no-underline">
          {m.persona.nombre} {m.persona.apellido}
        </Link>
      ),
    },
    { id: 'aviso', encabezado: t('fallidos.columnas.aviso'), className: 'hidden sm:table-cell', celda: (m) => nombreEvento(m.evento) },
    { id: 'fecha', encabezado: t('fallidos.columnas.fecha'), className: 'hidden md:table-cell', celda: (m) => formatearFechaHora(m.fecha, locale) },
    { id: 'motivo', encabezado: t('fallidos.columnas.motivo'), celda: (m) => t(`fallidos.motivo.${m.motivo}`) },
  ];

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex max-w-2xl flex-col gap-1">
          <h1 className="text-2xl font-semibold">{t('titulo')}</h1>
          <p className="text-sm text-muted-foreground">{t('descripcion')}</p>
        </div>
        {puedeEnviar && (
          <EnviarAvisoDialogo
            apiToken={apiToken}
            trigger={
              <Button>
                <Plus aria-hidden="true" />
                {t('enviar')}
              </Button>
            }
          />
        )}
      </div>

      <TablaDatos
        columnas={columnas}
        datos={avisos.items}
        obtenerId={(n) => n.id}
        etiqueta={t('etiquetaTabla')}
        mensajeVacio={puedeEnviar ? t('vacio') : t('vacioPastor')}
        accionVacio={
          puedeEnviar ? (
            <EnviarAvisoDialogo apiToken={apiToken} trigger={<Button>{t('enviar')}</Button>} />
          ) : undefined
        }
        encabezadoAcciones={t('columnas.acciones')}
        acciones={(n) => (
          <ButtonLink variant="outline" size="sm" render={<Link href={`/notificaciones/${n.id}`} />}>
            {t('ver')}
          </ButtonLink>
        )}
      />
      {totalPaginas(avisos.total) > 1 && (
        <Paginacion
          paginaActual={avisos.pagina}
          totalPaginas={totalPaginas(avisos.total)}
          renderEnlace={(p) => <Link href={hrefPagina('pagina', p)} />}
          etiquetaNav={t('paginado')}
          etiquetaAnterior={t('anterior')}
          etiquetaSiguiente={t('siguiente')}
        />
      )}

      <section aria-labelledby="titulo-mails-fallidos" className="flex flex-col gap-3 pt-4">
        <h2 id="titulo-mails-fallidos" className="text-xl font-semibold">
          {t('fallidos.titulo')}
        </h2>
        {fallidos.total === 0 ? (
          <p className="text-sm text-muted-foreground">{t('fallidos.todoBien')}</p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">{t('fallidos.descripcion')}</p>
            <TablaDatos
              columnas={columnasFallidos}
              datos={fallidos.items}
              obtenerId={(m) => m.entregaId}
              etiqueta={t('fallidos.etiquetaTabla')}
              mensajeVacio={t('fallidos.todoBien')}
            />
            {totalPaginas(fallidos.total) > 1 && (
              <Paginacion
                paginaActual={fallidos.pagina}
                totalPaginas={totalPaginas(fallidos.total)}
                renderEnlace={(p) => <Link href={hrefPagina('fallidos', p)} />}
                etiquetaNav={t('fallidos.paginado')}
                etiquetaAnterior={t('anterior')}
                etiquetaSiguiente={t('siguiente')}
              />
            )}
          </>
        )}
      </section>
    </div>
  );
}
