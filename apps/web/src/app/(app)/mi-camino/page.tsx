import Link from 'next/link';
import type { ReactNode } from 'react';
import { getLocale, getTranslations } from 'next-intl/server';
import { CalendarClock, CircleAlert, CircleCheck, Clock, Hourglass, Lock, MessageCircle, Search, Sparkles, UserRound } from 'lucide-react';
import {
  apiFetch,
  enlaceWhatsapp,
  formatearDiaEnArgentina,
  type CaminoDeLaPersona,
  type EstadoEtapa,
  type EtapaCamino,
} from '@vida-sobrenatural/shared-types';
import { CardEtapa, type CardEtapaProps } from '@vida-sobrenatural/ui';
import { auth } from '../../../auth';
import { RetirarDeclaracion, YaLoHice } from './acciones-historial';
import { AccionesVidaDeServicio } from './tarjeta-vida-de-servicio';
import { AccionesMinisterio } from './tarjeta-ministerio';
import { AccionesBautismo } from './tarjeta-bautismo';
import type { PropsAccionesEtapa } from './acciones-etapa';
import { SelectorMiCamino } from './selector-mi-camino';

/**
 * spec 006, Historia 1 y la parte de la Persona de la Historia 2 (T031, T041):
 * Mi camino por etapas. Una card por etapa, en el orden de `GET /camino/me`,
 * con su explicación (la de Primeros pasos: una sola fuente, FR-001), su
 * estado con texto + ícono (D81) y qué sigue. La de Vida Nueva lleva a
 * `/mi-camino/vida-nueva` (FR-005). "Ya lo hice" aparece donde `puedeDeclarar`
 * lo permite. Lo propio de cada etapa (pedir Vida de Servicio, Ministerio,
 * Bautismo) lo pone la spec de esa etapa en su `tarjeta-<etapa>.tsx`.
 * Si la API falla, lo atrapa `error.tsx`; mientras carga, `loading.tsx`.
 */

/**
 * FR-001: la explicación de cada etapa. Las tres primeras SON las de Primeros
 * pasos (`primerosPasos.paso2/3/4Descripcion`), leídas de ahí, no copiadas
 * (esa pantalla y su namespace son de la sesión ajustes-ux). La de Bautismo no
 * existe en docs/: es provisoria (D98, spec 006 Pregunta 3).
 */
const DESCRIPCION: Record<EtapaCamino, string> = {
  vida_nueva: 'primerosPasos.paso2Descripcion',
  vida_de_servicio: 'primerosPasos.paso3Descripcion',
  ministerio: 'primerosPasos.paso4Descripcion',
  bautismo: 'etapas.descripciones.bautismo',
};

/** Lo propio de cada etapa (specs 008, 009, 010), en la zona de acciones de su card. */
const ACCIONES_PROPIAS: Partial<Record<EtapaCamino, (props: PropsAccionesEtapa) => ReactNode>> = {
  vida_de_servicio: AccionesVidaDeServicio,
  ministerio: AccionesMinisterio,
  bautismo: AccionesBautismo,
};

const ICONO = 'text-primary';
const ICONO_NEUTRO = 'text-muted-foreground';

export default async function MiCaminoPage() {
  const session = await auth();
  const apiToken = session?.apiToken ?? '';
  const [t, tRaiz, locale] = await Promise.all([getTranslations('miCamino'), getTranslations(), getLocale()]);
  const camino = await apiFetch<CaminoDeLaPersona>('/camino/me', {
    headers: { Authorization: `Bearer ${apiToken}` },
    cache: 'no-store',
  });
  const fecha = (iso: string) => formatearDiaEnArgentina(iso, locale);
  const nombre = (etapa: EtapaCamino) => tRaiz(`etapas.${etapa}`);

  /** El estado en palabras de la card, y su enlace si tiene (FR-002, FR-005). */
  function presentar(estado: EstadoEtapa): Pick<CardEtapaProps, 'estado' | 'enlace' | 'aviso'> {
    const vn = camino.vidaNueva;
    const aviso = 'declaracion' in estado && estado.declaracion?.estado === 'no_confirmada' ? (
      noConfirmada(estado.declaracion.motivo)
    ) : undefined;

    switch (estado.estado) {
      case 'completada':
        if (estado.como === 'historial') {
          return { estado: { icono: <CircleCheck className={ICONO} />, texto: t('estados.historialTitulo'), detalle: t('estados.historialTexto') } };
        }
        if (estado.etapa === 'vida_nueva') {
          return {
            estado: {
              icono: <CircleCheck className={ICONO} />,
              texto: t('vidaNueva.finalizadoTitulo'),
              detalle: vn.estado === 'finalizado' ? t('estados.vidaNuevaFinalizada', { fecha: fecha(vn.finalizadoEn) }) : t('estados.completadaSistemaTexto'),
            },
            enlace: { render: <Link href="/mi-camino/vida-nueva" />, texto: t('estados.enlaceVerVidaNueva') },
          };
        }
        return { estado: { icono: <CircleCheck className={ICONO} />, texto: t('estados.completadaTitulo'), detalle: t('estados.completadaSistemaTexto') } };

      case 'en_revision':
        return {
          estado: { icono: <Hourglass className={ICONO} />, texto: t('estados.revisionTitulo'), detalle: t('estados.revisionTexto', { fecha: fecha(estado.desde) }) },
        };

      case 'en_curso':
        if (estado.etapa === 'vida_nueva' && vn.estado === 'buscando') {
          return {
            estado: { icono: <Search className={ICONO} />, texto: t('vidaNueva.buscandoTitulo'), detalle: t('estados.vidaNuevaBuscando') },
            enlace: { render: <Link href="/mi-camino/vida-nueva" />, texto: t('estados.enlaceVerPedido') },
          };
        }
        if (estado.etapa === 'vida_nueva' && vn.estado === 'en_curso') {
          return {
            estado: {
              icono: <UserRound className={ICONO} />,
              texto: t('vidaNueva.enCursoTitulo'),
              detalle: t('estados.vidaNuevaEnCurso', { nombre: `${vn.discipulador.nombre} ${vn.discipulador.apellido}` }),
            },
            enlace: { render: <Link href="/mi-camino/vida-nueva" />, texto: t('estados.enlaceVerDiscipulado') },
          };
        }
        return { estado: { icono: <Clock className={ICONO} />, texto: t('estados.enCursoTitulo'), detalle: t('estados.enCursoTexto') } };

      case 'proximamente':
        return { aviso, estado: { icono: <CalendarClock className={ICONO_NEUTRO} />, texto: t('estados.proximamenteTitulo'), detalle: t('estados.proximamenteTexto') } };

      case 'bloqueada': {
        const clave = estado.requisito.tipo === 'etapa_en_curso_o_completa' ? 'estados.requisitoEtapaEnCursoOCompleta' : 'estados.requisitoEtapaCompleta';
        const etapaRequerida = estado.requisito.tipo === 'ninguno' ? estado.etapa : estado.requisito.etapa;
        return { aviso, estado: { icono: <Lock className={ICONO_NEUTRO} />, texto: t('estados.bloqueadaTitulo'), detalle: t(clave, { etapa: nombre(etapaRequerida) }) } };
      }

      case 'disponible':
        if (estado.etapa === 'vida_nueva') {
          if (vn.estado === 'lo_pide_su_tutor') {
            // FR-044 de la 004: sin botón de pedido ni "Ya lo hice".
            return { aviso, estado: { icono: <UserRound className={ICONO} />, texto: t('vidaNueva.tutorTitulo'), detalle: t('vidaNueva.tutorTexto') } };
          }
          const baja = vn.estado === 'baja';
          return {
            aviso,
            estado: {
              icono: baja ? <CircleAlert className={ICONO_NEUTRO} /> : <Sparkles className={ICONO} />,
              texto: baja ? t('vidaNueva.bajaTitulo') : t('estados.disponibleTitulo'),
              detalle: baja ? t('estados.vidaNuevaBaja') : t('estados.vidaNuevaPuedePedir'),
            },
            enlace: { render: <Link href="/mi-camino/vida-nueva" />, texto: t('estados.enlacePedir') },
          };
        }
        return { aviso, estado: { icono: <Sparkles className={ICONO} />, texto: t('estados.disponibleTitulo'), detalle: t('estados.disponibleTexto') } };
    }
  }

  /** FR-011/T041: el mensaje amable de una declaración no confirmada, con el motivo y a quién escribirle. */
  function noConfirmada(motivo: string | null) {
    const sede = camino.sede;
    return (
      <div role="note" className="flex gap-3 rounded-md border border-border p-3">
        <CircleAlert aria-hidden className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
        <div className="flex flex-col gap-1 text-base">
          <p className="font-medium">{t('estados.noConfirmadaTitulo')}</p>
          <p className="text-muted-foreground">{t('estados.noConfirmadaTexto')}</p>
          {motivo && <p className="text-muted-foreground">{t('estados.noConfirmadaMotivo', { motivo })}</p>}
          {sede?.telefono ? (
            <a href={`tel:${sede.telefono}`} className="w-fit font-medium text-primary underline underline-offset-2">
              {t('estados.noConfirmadaTelefono', { telefono: sede.telefono })}
            </a>
          ) : (
            sede && <p className="text-muted-foreground">{t('estados.noConfirmadaSinTelefono', { sede: sede.nombre })}</p>
          )}
          {/* D218: si la Sede cargó el WhatsApp de Secretaría, también por ahí (texto + ícono, D81). */}
          {sede?.whatsapp && (
            <a
              href={enlaceWhatsapp(sede.whatsapp)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-fit items-center gap-1.5 font-medium text-primary underline underline-offset-2"
            >
              <MessageCircle aria-hidden className="size-4 shrink-0" />
              {t('estados.noConfirmadaWhatsapp')}
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
      <SelectorMiCamino actual="/mi-camino" />
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">{t('titulo')}</h1>
        <p className="text-base text-muted-foreground">{t('estados.introduccion')}</p>
      </div>

      {camino.etapas.map((estado) => {
        const Propias = ACCIONES_PROPIAS[estado.etapa];
        const puede = 'puedeDeclarar' in estado && estado.puedeDeclarar;
        return (
          <CardEtapa
            key={estado.etapa}
            id={`etapa-${estado.etapa}`}
            titulo={nombre(estado.etapa)}
            descripcion={tRaiz(DESCRIPCION[estado.etapa])}
            {...presentar(estado)}
          >
            {Propias && <Propias estado={estado} apiToken={apiToken} />}
            {estado.estado === 'en_revision' && <RetirarDeclaracion declaracionId={estado.declaracionId} nombreEtapa={nombre(estado.etapa)} />}
            {puede && <YaLoHice etapa={estado.etapa} nombreEtapa={nombre(estado.etapa)} />}
          </CardEtapa>
        );
      })}
    </div>
  );
}
