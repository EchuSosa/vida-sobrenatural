'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { CircleX, Send, Undo2 } from 'lucide-react';
import {
  type Cruce,
  type DiscipuladorEnCruce,
  type PropuestaHistorial,
  type SolicitudDetalle,
  ApiError,
  apiFetch,
  formatearFechaHora,
} from '@vida-sobrenatural/shared-types';
import { Button, ConfirmDestructiveDialog, MigaDePan, minutosAHHMM, useEnvio } from '@vida-sobrenatural/ui';
import { CruceDiscipuladores, type EtiquetasCruce } from '../../../components/cruce';
import { EstadoSolicitudTexto } from '../estado-solicitud-texto';
import { diasDesde } from '../constantes';

interface Eleccion {
  discipulador: DiscipuladorEnCruce;
  grupoDestinoId?: string;
}

/** Las etiquetas del componente de cruce (lote 0, T012c) desde `solicitudes.cruce` y `franjas` (H-151). */
function useEtiquetasCruce(): EtiquetasCruce {
  const t = useTranslations('solicitudes.cruce');
  const tf = useTranslations('franjas');
  return {
    dias: tf.raw('dias') as EtiquetasCruce['dias'],
    sinDisponibles: t('sinDisponibles'),
    ningunoCoincide: t('ningunoCoincide'),
    tituloNoCoinciden: t('tituloNoCoinciden'),
    sugerido: t('sugerido'),
    elegir: t('elegir'),
    sumarAlGrupo: t('sumarAlGrupo'),
    razones: { horario: t('razones.horario'), genero: t('razones.genero') },
    lugar: (g) => t('lugar', { personas: g.personas.join(', '), ocupado: g.ocupado, maximo: g.maximo }),
    coincideHorario: t('coincideHorario'),
    noCoincideHorario: t('noCoincideHorario'),
  };
}

function discipuladoresDelCruce(cruce: Cruce): DiscipuladorEnCruce[] {
  const porId = new Map<string, DiscipuladorEnCruce>();
  for (const f of cruce.franjas) for (const d of f.coinciden) porId.set(d.id, d);
  for (const d of cruce.noCoinciden) porId.set(d.id, d);
  return [...porId.values()];
}

/**
 * specs/004, T027a: el detalle de una Solicitud. El cruce lo arma la API
 * (T011c) y lo muestra `components/cruce.tsx`; esta página solo guarda a quién
 * eligió el Admin y ejecuta la acción. Una sola acción principal: "Proponer a
 * …", con confirmación (FR-036). Ante `DISCIPULADOR_NO_DISPONIBLE` o
 * `GRUPO_SIN_LUGAR`, recarga el cruce (router.refresh) y lo dice.
 */
export function SolicitudDetalleCliente({
  solicitud,
  cruce,
  apiToken,
  puedeAprobar,
}: {
  solicitud: SolicitudDetalle;
  cruce: Cruce | null;
  apiToken: string;
  puedeAprobar: boolean;
}) {
  const t = useTranslations('solicitudes');
  const td = useTranslations('solicitudes.detalle');
  const te = useTranslations('errors');
  const tf = useTranslations('franjas');
  const locale = useLocale();
  const router = useRouter();
  const etiquetasCruce = useEtiquetasCruce();
  const [eleccion, setEleccion] = useState<Eleccion | null>(null);
  const dias = tf.raw('dias') as string[];
  const nombrePersona = `${solicitud.persona.nombre} ${solicitud.persona.apellido}`;
  const nombreElegido = eleccion ? `${eleccion.discipulador.nombre} ${eleccion.discipulador.apellido}` : '';

  async function llamar(ruta: string, body?: unknown) {
    return apiFetch(`/discipulado/solicitudes/${solicitud.id}/${ruta}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  /** Un 409 dice qué cambió; la pantalla se actualiza para que el Admin decida con lo de ahora. */
  function avisarError(error: unknown) {
    const code = error instanceof ApiError ? error.code : null;
    toast.error(code && te.has(code) ? te(code) : td('errores.generico'));
    if (error instanceof ApiError && error.code !== 'ERROR_INTERNO') {
      setEleccion(null);
      router.refresh();
    }
  }

  const { enviando: proponiendo, ejecutar: proponer } = useEnvio(async () => {
    if (!eleccion) return;
    try {
      await llamar('proponer', { discipuladorId: eleccion.discipulador.id, grupoDestinoId: eleccion.grupoDestinoId });
      toast.success(td('propuestaHecha', { nombre: nombreElegido }));
      setEleccion(null);
      router.refresh();
    } catch (error) {
      avisarError(error);
    }
  });

  const { enviando: rechazando, ejecutar: rechazar } = useEnvio(async () => {
    try {
      await llamar('rechazar');
      toast.success(td('rechazadaHecha'));
      router.refresh();
    } catch (error) {
      avisarError(error);
    }
  });

  const vigente = solicitud.propuestaVigente;
  const nombreVigente = vigente ? `${vigente.discipulador.nombre} ${vigente.discipulador.apellido}` : '';
  const { enviando: retirando, ejecutar: retirarPropuesta } = useEnvio(async () => {
    try {
      await llamar('retirar-propuesta');
      toast.success(td('retiradaHecha'));
      router.refresh();
    } catch (error) {
      avisarError(error);
    }
  });

  const ocupado = proponiendo || rechazando || retirando;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-16">
      <MigaDePan tramos={[{ label: t('titulo'), href: '/solicitudes' }, { label: nombrePersona }]} LinkComponente={Link} />

      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">{td('titulo', { nombre: nombrePersona })}</h1>
        <p className="text-muted-foreground">
          {td('edad', { edad: solicitud.personaEdad })} · {td('pedidaEl', { fecha: formatearFechaHora(solicitud.createdAt, locale) })}
          {solicitud.creadoPor && ` ${td('cargadaPor', { nombre: `${solicitud.creadoPor.nombre} ${solicitud.creadoPor.apellido}` })}`}
          {solicitud.revisadoPor && ` ${td('revisadaPor', { nombre: `${solicitud.revisadoPor.nombre} ${solicitud.revisadoPor.apellido}` })}`}
        </p>
        <p className="font-medium">
          <EstadoSolicitudTexto solicitud={solicitud} />
        </p>
      </div>

      <section aria-labelledby="horarios-titulo" className="flex flex-col gap-2">
        <h2 id="horarios-titulo" className="text-lg font-semibold">
          {td('franjasTitulo')}
        </h2>
        <ul className="flex flex-wrap gap-2">
          {solicitud.franjas.map((f, i) => (
            <li key={`${f.diaSemana}-${f.inicio}-${i}`} className="rounded-md border border-border px-3 py-2 text-sm">
              {dias[f.diaSemana]} {minutosAHHMM(f.inicio)}
              {tf('separador')}
              {minutosAHHMM(f.fin)}
            </li>
          ))}
        </ul>
      </section>

      {puedeAprobar && solicitud.estado === 'pendiente' && cruce && (
        <section aria-labelledby="cruce-titulo" className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 id="cruce-titulo" className="text-lg font-semibold">
              {td('cruceTitulo')}
            </h2>
            <p className="text-sm text-muted-foreground">{td('cruceAyuda')}</p>
          </div>
          <CruceDiscipuladores
            cruce={cruce}
            etiquetas={etiquetasCruce}
            disabled={ocupado}
            onElegir={(discipuladorId, grupoDestinoId) => {
              const discipulador = discipuladoresDelCruce(cruce).find((d) => d.id === discipuladorId);
              if (discipulador) setEleccion({ discipulador, grupoDestinoId });
            }}
          />

          <div className="sticky bottom-0 flex flex-col gap-3 border-t border-border bg-background py-4">
            <p aria-live="polite" className="text-sm">
              {eleccion
                ? eleccion.grupoDestinoId
                  ? td('elegidoGrupo', {
                      nombre: nombreElegido,
                      personas: eleccion.discipulador.gruposConLugar.find((g) => g.grupoId === eleccion.grupoDestinoId)?.personas.join(', ') ?? '',
                    })
                  : td('elegido', { nombre: nombreElegido })
                : td('sinElegir')}
            </p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <ConfirmDestructiveDialog
                trigger={
                  <Button type="button" variant="outline" loading={rechazando} disabled={ocupado && !rechazando} className="h-11">
                    <CircleX aria-hidden />
                    {td('rechazar')}
                  </Button>
                }
                titulo={td('rechazarTitulo', { nombre: nombrePersona })}
                descripcion={td('rechazarDescripcion', { nombre: nombrePersona })}
                textoConfirmar={td('rechazarConfirmar')}
                textoCancelar={td('volver')}
                onConfirmar={() => void rechazar()}
              />
              {eleccion && (
                <ConfirmDestructiveDialog
                  trigger={
                    <Button type="button" loading={proponiendo} disabled={ocupado && !proponiendo} className="h-11">
                      <Send aria-hidden />
                      {td('proponer', { nombre: nombreElegido })}
                    </Button>
                  }
                  titulo={td('proponerTitulo', { nombre: nombreElegido })}
                  descripcion={td('proponerDescripcion', { nombre: nombreElegido })}
                  textoConfirmar={td('proponerConfirmar', { nombre: nombreElegido })}
                  textoCancelar={td('volver')}
                  onConfirmar={() => void proponer()}
                />
              )}
            </div>
          </div>
        </section>
      )}

      {puedeAprobar && solicitud.estado === 'propuesta' && vigente && (
        <section className="flex flex-col gap-3 rounded-lg border border-border p-4">
          <p className="font-medium">{td('propuestaA', { nombre: nombreVigente, dias: diasDesde(vigente.propuestaEn) })}</p>
          <p className="text-sm text-muted-foreground">{td('propuestaYAhora', { nombre: nombreVigente })}</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <ConfirmDestructiveDialog
              trigger={
                <Button type="button" variant="outline" loading={retirando} className="h-11">
                  <Undo2 aria-hidden />
                  {td('retirarPropuesta')}
                </Button>
              }
              titulo={td('retirarTitulo', { nombre: nombreVigente })}
              descripcion={td('retirarDescripcion', { nombre: nombreVigente })}
              textoConfirmar={td('retirarConfirmar')}
              textoCancelar={td('volver')}
              onConfirmar={() => void retirarPropuesta()}
            />
          </div>
        </section>
      )}

      {(solicitud.estado === 'aprobada' || solicitud.estado === 'rechazada' || solicitud.estado === 'retirada') && (
        <p className="text-muted-foreground">{td(`cerrada.${solicitud.estado}`)}</p>
      )}

      {puedeAprobar && <Historial historial={solicitud.historial} />}
    </div>
  );
}

/** FR-038: a quién se le propuso, cuándo, quién y cómo terminó. Solo con `solicitudes.aprobar` (la API no lo manda sin él). */
function Historial({ historial }: { historial: PropuestaHistorial[] }) {
  const td = useTranslations('solicitudes.detalle');
  const locale = useLocale();
  const textoEstado = (p: PropuestaHistorial) =>
    p.estado === 'retirada'
      ? td(p.retiradaPor === 'persona' ? 'historialEstados.retiradaPersona' : 'historialEstados.retiradaAdmin')
      : td(`historialEstados.${p.estado}`);

  return (
    <section aria-labelledby="historial-titulo" className="flex flex-col gap-2">
      <h2 id="historial-titulo" className="text-lg font-semibold">
        {td('historialTitulo')}
      </h2>
      {historial.length === 0 ? (
        <p className="text-sm text-muted-foreground">{td('historialVacio')}</p>
      ) : (
        <ol className="flex flex-col gap-2">
          {historial.map((p) => (
            <li key={p.id} className="flex flex-col gap-1 rounded-md border border-border p-3 text-sm">
              <span className="font-medium">
                {p.discipulador.nombre} {p.discipulador.apellido} — {textoEstado(p)}
              </span>
              {p.propuestaPor && (
                <span className="text-muted-foreground">
                  {td('propuestaPor', { nombre: `${p.propuestaPor.nombre} ${p.propuestaPor.apellido}`, fecha: formatearFechaHora(p.propuestaEn, locale) })}
                </span>
              )}
              {p.estado === 'declinada' && (
                <span className="text-muted-foreground">{p.motivoDeclinacion ? td('motivo', { motivo: p.motivoDeclinacion }) : td('sinMotivo')}</span>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
