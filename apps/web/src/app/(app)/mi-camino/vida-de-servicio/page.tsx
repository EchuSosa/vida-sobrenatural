import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { CalendarX } from 'lucide-react';
import {
  apiFetch,
  formatearDiaEnArgentina,
  type EdicionResumen,
  type EstadoMiVidaDeServicio,
  type MiAsistencia,
  type SemanaParaPersona,
} from '@vida-sobrenatural/shared-types';
import { ButtonLink, EstadoSemana, EstadoVacio, MigaDePan } from '@vida-sobrenatural/ui';
import { auth } from '../../../../auth';

/**
 * spec 008, T046 (FR-021, FR-025, FR-026, FR-031, FR-034): Mi camino → Vida
 * de Servicio. Las semanas en orden con su estado (texto + ícono, D81); las
 * liberadas se abren. "Viniste 5 de 6 encuentros" y los días de falta (solo
 * los propios). Después de una baja, solo lo que tenía hasta ese día.
 * Cargando: `loading.tsx`; error: `error.tsx`; vacío: si no está en Vida de
 * Servicio, vuelve a Mi camino.
 */
export default async function MiVidaDeServicioPage() {
  const session = await auth();
  const [t, tRaiz, locale] = await Promise.all([getTranslations('vidaDeServicio'), getTranslations('miCamino'), getLocale()]);
  const mia = await apiFetch<EstadoMiVidaDeServicio>('/vida-de-servicio/me', {
    headers: { Authorization: `Bearer ${session?.apiToken}` },
    cache: 'no-store',
  });
  const fecha = (iso: string) => formatearDiaEnArgentina(iso, locale);

  let vista: { intro: string; edicion: EdicionResumen; semanas: SemanaParaPersona[]; asistencia?: MiAsistencia } | null = null;
  if (mia.estado === 'en_curso') vista = { intro: t('detalle.introEnCurso', { nombre: mia.edicion.nombre }), edicion: mia.edicion, semanas: mia.semanas, asistencia: mia.asistencia };
  if (mia.estado === 'completada' && mia.edicion && mia.semanas) vista = { intro: t('detalle.introCompletada', { nombre: mia.edicion.nombre }), edicion: mia.edicion, semanas: mia.semanas };
  if (mia.estado === 'puede_pedir' && mia.anterior && mia.anterior.tipo !== 'rechazada') {
    vista = { intro: t('detalle.introBaja', { nombre: mia.anterior.edicion.nombre }), edicion: mia.anterior.edicion, semanas: mia.anterior.semanas };
  }

  const textosEstado = {
    liberada: t('estadosSemana.liberada'),
    proxima: t('estadosSemana.proxima'),
    sin_material: t('estadosSemana.sin_material'),
    cargado_por_liberar: t('estadosSemana.cargado_por_liberar'),
    vencida_sin_material: t('estadosSemana.vencida_sin_material'),
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
      <MigaDePan tramos={[{ label: tRaiz('titulo'), href: '/mi-camino' }, { label: t('titulo') }]} LinkComponente={Link} />
      <h1 className="text-3xl font-semibold tracking-tight">{t('titulo')}</h1>

      {!vista ? (
        <EstadoVacio
          mensaje={t('detalle.sinVidaDeServicio')}
          accion={
            <ButtonLink render={<Link href="/mi-camino" />} size="xl" className="text-base">
              {t('detalle.volverAMiCamino')}
            </ButtonLink>
          }
        />
      ) : (
        <>
          <p className="text-base text-muted-foreground">{vista.intro}</p>

          <section aria-labelledby="titulo-semanas" className="flex flex-col gap-3">
            <h2 id="titulo-semanas" className="text-xl font-semibold">
              {t('detalle.semanasTitulo')}
            </h2>
            <ol className="flex flex-col gap-2">
              {vista.semanas.map((s) => (
                <li key={s.numero} className="flex flex-col gap-1 rounded-lg border border-border p-4 text-base">
                  {s.estado === 'liberada' ? (
                    <Link
                      href={`/mi-camino/vida-de-servicio/semanas/${s.numero}`}
                      className="font-medium text-primary underline underline-offset-2"
                      aria-label={t('detalle.abrirSemana', { numero: s.numero })}
                    >
                      {t('semanaConTitulo', { numero: s.numero, titulo: s.titulo })}
                    </Link>
                  ) : (
                    <span className="font-medium">{t('semana', { numero: s.numero })}</span>
                  )}
                  <span className="text-muted-foreground">{t('fechaLiberacion', { fecha: fecha(s.fechaLiberacion) })}</span>
                  <EstadoSemana estado={s.estado} textos={textosEstado} className="text-base" />
                </li>
              ))}
            </ol>
          </section>

          {vista.asistencia && (
            <section aria-labelledby="titulo-asistencia" className="flex flex-col gap-3">
              <h2 id="titulo-asistencia" className="text-xl font-semibold">
                {t('detalle.asistenciaTitulo')}
              </h2>
              <p className="text-base">
                {vista.asistencia.encuentros === 0
                  ? t('detalle.asistenciaSinEncuentros')
                  : t('detalle.asistenciaResumen', { presentes: vista.asistencia.presentes, encuentros: vista.asistencia.encuentros })}
              </p>
              {vista.asistencia.faltas.length > 0 && (
                <div className="flex flex-col gap-2">
                  <h3 className="text-base font-medium">{t('detalle.faltasTitulo')}</h3>
                  <ul className="flex flex-col gap-1">
                    {vista.asistencia.faltas.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-base text-muted-foreground">
                        <CalendarX aria-hidden className="size-4 shrink-0" />
                        {fecha(f)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
