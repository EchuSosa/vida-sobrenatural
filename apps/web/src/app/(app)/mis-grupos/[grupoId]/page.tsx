import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { CircleAlert, ClipboardCheck, Phone } from 'lucide-react';
import { ApiError, apiFetch, formatearDiaEnArgentina, hoyEnArgentina, type MiGrupoDetalle } from '@vida-sobrenatural/shared-types';
import { ButtonLink, EstadoSemana, MigaDePan } from '@vida-sobrenatural/ui';
import { requerirPermiso, tienePermisoSesion } from '../../../../auth';
import { ProponerBaja, ProponerFinalizacion } from './acciones-mi-grupo';

/**
 * spec 008, T074 + T058 + T062 (FR-019, FR-029, FR-032, FR-035, FR-043): el
 * detalle de una edición para el Líder, 360 px primero. "Tomar asistencia"
 * arriba, en la zona del pulgar; el cronograma con el estado de cada semana
 * (que lleva a cargar o editar su material); los inscriptos con sus faltas
 * (alerta con texto + ícono desde 2), su teléfono como `tel:` y "Proponer
 * baja"; y el cierre de la edición. Una edición ajena es un 404 (FR-019).
 */
export default async function MiGrupoPage({ params }: { params: Promise<{ grupoId: string }> }) {
  const session = await requerirPermiso('mis_grupos.ver');
  const { grupoId } = await params;
  const [t, locale] = await Promise.all([getTranslations('misGrupos'), getLocale()]);
  let g: MiGrupoDetalle;
  try {
    g = await apiFetch<MiGrupoDetalle>(`/vida-de-servicio/mis-grupos/${encodeURIComponent(grupoId)}`, {
      headers: { Authorization: `Bearer ${session.apiToken}` },
      cache: 'no-store',
    });
  } catch (e) {
    if (e instanceof ApiError && e.code === 'GRUPO_NO_ENCONTRADO') notFound();
    throw e;
  }
  const fecha = (iso: string) => formatearDiaEnArgentina(iso, locale);
  const enCurso = g.estado === 'en_curso';
  const puedeGestionar = enCurso && tienePermisoSesion(session, 'mis_grupos.gestionar');
  const hoy = hoyEnArgentina();
  const tv = await getTranslations('vidaDeServicio.estadosSemana');
  const estados = {
    liberada: tv('liberada'),
    proxima: tv('proxima'),
    sin_material: tv('sin_material'),
    cargado_por_liberar: tv('cargado_por_liberar'),
    vencida_sin_material: tv('vencida_sin_material'),
  };
  const f = g.finalizacion;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
      <MigaDePan tramos={[{ label: t('titulo'), href: '/mis-grupos' }, { label: g.nombre }]} LinkComponente={Link} />
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight break-words">{g.nombre}</h1>
        <p className="text-base text-muted-foreground">{t('detalle.sede', { sede: g.sede, fecha: fecha(g.fechaInicio) })}</p>
        <p className="text-base text-muted-foreground">{t('detalle.lideres', { nombres: g.lideres.map((l) => `${l.nombre} ${l.apellido}`).join(', ') })}</p>
      </div>

      {enCurso ? (
        puedeGestionar && (
          <ButtonLink render={<Link href={`/mis-grupos/${g.grupoId}/asistencia`} />} size="xl" className="w-full text-base sm:w-fit">
            <ClipboardCheck aria-hidden />
            {t('detalle.tomarAsistencia')}
          </ButtonLink>
        )
      ) : (
        <p role="note" className="rounded-md border border-border p-3 text-base">
          {t('detalle.terminada')}
        </p>
      )}

      <section aria-labelledby="titulo-semanas" className="flex flex-col gap-3">
        <h2 id="titulo-semanas" className="text-xl font-semibold">
          {t('detalle.cronogramaTitulo')}
        </h2>
        <ol className="flex flex-col gap-2">
          {g.semanas.map((s) => {
            const tieneMaterial = s.estado === 'liberada' || s.estado === 'cargado_por_liberar';
            const etiqueta = !puedeGestionar
              ? t('detalle.verMaterial', { numero: s.numero })
              : tieneMaterial
                ? t('detalle.editarMaterial', { numero: s.numero })
                : t('detalle.cargarMaterial', { numero: s.numero });
            return (
              <li key={s.numero} className="flex flex-col gap-1 rounded-lg border border-border p-4 text-base">
                <span className="font-medium">{t('detalle.semana', { numero: s.numero })}</span>
                <span className="text-muted-foreground">{t('detalle.fecha', { fecha: fecha(s.fechaLiberacion) })}</span>
                <EstadoSemana estado={s.estado} textos={estados} />
                {(puedeGestionar || tieneMaterial) && (
                  <Link href={`/mis-grupos/${g.grupoId}/semanas/${s.numero}`} className="flex min-h-11 w-fit items-center font-medium text-primary underline underline-offset-2">
                    {etiqueta}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      <section aria-labelledby="titulo-inscriptos" className="flex flex-col gap-3">
        <h2 id="titulo-inscriptos" className="text-xl font-semibold">
          {t('detalle.inscriptosTitulo')}
        </h2>
        {g.inscriptos.length === 0 ? (
          <p className="text-base text-muted-foreground">{t('detalle.sinInscriptos')}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {g.inscriptos.map((i) => {
              const nombre = `${i.nombre} ${i.apellido}`;
              return (
                <li key={i.inscripcionId} className="flex flex-col gap-2 rounded-lg border border-border p-4 text-base" data-testid="inscripto">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-medium break-words">{nombre}</span>
                    <span className="text-muted-foreground">{t(`detalle.estados.${i.estado}`)}</span>
                  </div>
                  {i.alertaFaltas ? (
                    <span className="flex items-center gap-2 font-medium">
                      <CircleAlert aria-hidden className="size-4 shrink-0 text-primary" />
                      {t('detalle.alertaFaltas', { cantidad: i.faltas })}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">{t('detalle.faltas', { cantidad: i.faltas })}</span>
                  )}
                  {i.telefono && (
                    <a href={`tel:${i.telefono}`} className="flex min-h-11 w-fit items-center gap-2 text-primary underline underline-offset-2">
                      <Phone aria-hidden className="size-4" />
                      {t('detalle.llamar', { nombre: i.nombre, telefono: i.telefono })}
                    </a>
                  )}
                  {i.bajaPropuesta && <p className="text-muted-foreground">{t('detalle.bajaPropuesta', { tipo: t(`detalle.tipos.${i.bajaPropuesta.tipo}`), fecha: fecha(i.bajaPropuesta.en) })}</p>}
                  {!i.bajaPropuesta && i.bajaRechazada && (
                    <p className="text-muted-foreground">
                      {i.bajaRechazada.motivo
                        ? t('detalle.bajaRechazadaMotivo', { fecha: fecha(i.bajaRechazada.en), motivo: i.bajaRechazada.motivo })
                        : t('detalle.bajaRechazada', { fecha: fecha(i.bajaRechazada.en) })}
                    </p>
                  )}
                  {puedeGestionar && i.estado === 'activa' && !i.bajaPropuesta && <ProponerBaja grupoId={g.grupoId} inscripcionId={i.inscripcionId} nombre={nombre} />}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {enCurso && (
        <section aria-labelledby="titulo-finalizacion" className="flex flex-col gap-3">
          <h2 id="titulo-finalizacion" className="text-xl font-semibold">
            {t('detalle.finalizacionTitulo')}
          </h2>
          {f.propuestaEn ? (
            <p className="text-base">{t('detalle.finalizacionPropuesta', { fecha: fecha(f.propuestaEn) })}</p>
          ) : (
            <>
              {f.rechazadaEn && (
                <p className="text-base">
                  {f.motivoRechazo
                    ? t('detalle.finalizacionRechazadaMotivo', { fecha: fecha(f.rechazadaEn), motivo: f.motivoRechazo })
                    : t('detalle.finalizacionRechazada', { fecha: fecha(f.rechazadaEn) })}
                </p>
              )}
              {f.sePuedeProponerDesde && f.sePuedeProponerDesde > hoy ? (
                <p className="text-base text-muted-foreground">{t('detalle.finalizacionTodavia', { fecha: fecha(f.sePuedeProponerDesde) })}</p>
              ) : (
                <>
                  <p className="text-base text-muted-foreground">{t('detalle.finalizacionPuede')}</p>
                  {puedeGestionar && <ProponerFinalizacion grupoId={g.grupoId} nombre={g.nombre} />}
                </>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
}
