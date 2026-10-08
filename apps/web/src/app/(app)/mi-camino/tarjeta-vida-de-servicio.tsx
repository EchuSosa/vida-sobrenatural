import Link from 'next/link';
import type { ReactNode } from 'react';
import { getLocale, getTranslations } from 'next-intl/server';
import { BookOpenCheck, Hourglass, Info, PartyPopper, UserRound } from 'lucide-react';
import { apiFetch, formatearDiaEnArgentina, type EstadoMiVidaDeServicio, type MotivoNoCumple } from '@vida-sobrenatural/shared-types';
import { ButtonLink } from '@vida-sobrenatural/ui';
import type { PropsAccionesEtapa } from './acciones-etapa';
import { PedirVidaDeServicio, RetirarPedidoVidaDeServicio } from './vida-de-servicio/acciones-vida-de-servicio';

const MOTIVO: Record<MotivoNoCumple, string> = {
  sin_vida_nueva: 'card.noCumpleSinVidaNueva',
  vida_nueva_en_curso: 'card.noCumpleVidaNuevaEnCurso',
  declaracion_en_revision: 'card.noCumpleDeclaracionEnRevision',
};

/**
 * spec 008, T027 (FR-009, FR-025, FR-026, D151): lo propio de la card de Vida
 * de Servicio en Mi camino. Pide `GET /vida-de-servicio/me` y muestra el
 * estado de la Persona con texto + ícono y qué sigue: por qué todavía no
 * (con el enlace a Vida Nueva y la mención de "Ya lo hice", D144), anotarse
 * eligiendo edición, el pedido pendiente con "Retirar", la edición en curso
 * y el material, o la etapa terminada. Si la API falla, lo atrapa el
 * `error.tsx` de Mi camino.
 */
export async function AccionesVidaDeServicio({ estado, apiToken }: PropsAccionesEtapa) {
  // La 006 ya dice "completada" y "en revisión" con su texto genérico; lo propio solo suma ahí el material.
  if (estado.estado === 'en_revision' || estado.estado === 'proximamente') return null;
  const [t, locale] = await Promise.all([getTranslations('vidaDeServicio'), getLocale()]);
  const mia = await apiFetch<EstadoMiVidaDeServicio>('/vida-de-servicio/me', {
    headers: { Authorization: `Bearer ${apiToken}` },
    cache: 'no-store',
  });
  const fecha = (iso: string) => formatearDiaEnArgentina(iso, locale);

  switch (mia.estado) {
    case 'no_cumple':
      return (
        <Bloque icono={<Info className="text-muted-foreground" />} titulo={t(MOTIVO[mia.motivo])}>
          {mia.motivo === 'sin_vida_nueva' && <p>{t('card.yaLoHiceVidaNueva')}</p>}
          <ButtonLink render={<Link href="/mi-camino/vida-nueva" />} variant="outline" size="xl" className="w-fit text-base">
            {t('card.verVidaNueva')}
          </ButtonLink>
        </Bloque>
      );

    case 'lo_pide_su_tutor':
      return (
        <Bloque icono={<UserRound className="text-primary" />} titulo={t('card.tutorTitulo')}>
          <p>{t('card.tutorTexto')}</p>
        </Bloque>
      );

    case 'puede_pedir':
      return (
        <Bloque icono={<BookOpenCheck className="text-primary" />} titulo={mia.ediciones.length > 0 ? t('card.puedePedirConEdiciones', { cantidad: mia.ediciones.length }) : t('card.puedePedirSinEdiciones')}>
          {mia.anterior?.tipo === 'rechazada' && <p>{t('card.anteriorRechazada')}</p>}
          {mia.anterior && mia.anterior.tipo !== 'rechazada' && (
            <>
              <p>{t('card.anteriorBaja', { nombre: mia.anterior.edicion.nombre })}</p>
              {mia.anterior.semanas.length > 0 && (
                <ButtonLink render={<Link href="/mi-camino/vida-de-servicio" />} variant="outline" size="xl" className="w-fit text-base">
                  {t('card.verMaterialAnterior')}
                </ButtonLink>
              )}
            </>
          )}
          <PedirVidaDeServicio
            ediciones={mia.ediciones.map((e) => ({
              grupoId: e.grupoId,
              etiqueta: e.sede
                ? t('card.edicionOpcionSede', { nombre: e.nombre, sede: e.sede, fecha: fecha(e.fechaInicio) })
                : t('card.edicionOpcion', { nombre: e.nombre, fecha: fecha(e.fechaInicio) }),
              ayuda: t('card.edicionDia', { dia: t(`dias.${e.diaLiberacion}`) }),
            }))}
          />
        </Bloque>
      );

    case 'pendiente':
      return (
        <Bloque icono={<Hourglass className="text-primary" />} titulo={t('card.pendienteTitulo')}>
          <p>{mia.edicion ? t('card.pendienteConEdicion', { nombre: mia.edicion.nombre }) : t('card.pendienteSinEdicion')}</p>
          {mia.creadaEnSuNombre && <p>{t('card.pendienteEnSuNombre')}</p>}
          <RetirarPedidoVidaDeServicio />
        </Bloque>
      );

    case 'en_curso': {
      const liberadas = mia.semanas.filter((s) => s.estado === 'liberada').length;
      return (
        <Bloque icono={<BookOpenCheck className="text-primary" />} titulo={t('card.enCursoTitulo')}>
          <p>{t('card.enCursoTexto', { nombre: mia.edicion.nombre, liberadas })}</p>
          <ButtonLink render={<Link href="/mi-camino/vida-de-servicio" />} size="xl" className="w-fit text-base">
            {t('card.verMiVidaDeServicio')}
          </ButtonLink>
        </Bloque>
      );
    }

    case 'completada':
      return (
        <Bloque icono={<PartyPopper className="text-primary" />} titulo={t('card.siguientePaso')}>
          {mia.edicion && (
            <>
              <p>{t('card.completadaInscripcion', { nombre: mia.edicion.nombre })}</p>
              <ButtonLink render={<Link href="/mi-camino/vida-de-servicio" />} variant="outline" size="xl" className="w-fit text-base">
                {t('card.verMaterial')}
              </ButtonLink>
            </>
          )}
        </Bloque>
      );
  }
}

/** Un estado propio de la etapa: ícono decorativo + texto (D81) y lo que se puede hacer. */
function Bloque({ icono, titulo, children }: { icono: ReactNode; titulo: string; children?: ReactNode }) {
  return (
    <div className="flex w-full flex-col gap-3 rounded-md bg-muted/50 p-4 text-base" data-testid="vida-de-servicio-estado">
      <div className="flex gap-3">
        <span className="mt-0.5 flex shrink-0 [&_svg]:size-5" aria-hidden="true">
          {icono}
        </span>
        <div className="flex flex-col gap-2">
          <p className="font-medium">{titulo}</p>
          {children && <div className="flex flex-col gap-3 text-muted-foreground">{children}</div>}
        </div>
      </div>
    </div>
  );
}
