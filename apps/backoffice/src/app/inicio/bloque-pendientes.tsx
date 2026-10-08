'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { CircleCheckBig, UserRoundCheck } from 'lucide-react';
import { TIPOS_SOLICITUD, type ConteoAbiertas, type Pagina, type TipoSolicitud } from '@vida-sobrenatural/shared-types';
import { ICONO_TIPO_SOLICITUD } from '../../config/solicitudes';
import { useDatosApi } from '../../hooks/use-datos-api';
import { Bloque } from './bloque';

/**
 * spec 013, H3.5 (FR-020): cuánto espera una respuesta, por tipo, cada uno
 * enlazado a la bandeja filtrada; y los menores que esperan a su tutor.
 */
export function BloquePendientes({ apiToken, vePendientesTutor }: { apiToken: string; vePendientesTutor: boolean }) {
  const t = useTranslations('inicio.solicitudes');
  const tTipos = useTranslations('bandeja.tipos');
  const conteo = useDatosApi<ConteoAbiertas>('/solicitudes/conteo-abiertas', apiToken);
  const tutor = useDatosApi<Pagina<unknown>>(vePendientesTutor ? '/personas/pendientes-tutor?take=1' : null, apiToken);

  const estado = conteo.estado === 'error' || (vePendientesTutor && tutor.estado === 'error') ? 'error' : conteo.estado === 'cargando' || (vePendientesTutor && tutor.estado === 'cargando') ? 'cargando' : 'listo';
  const tipos = conteo.estado === 'listo' ? TIPOS_SOLICITUD.filter((tipo): tipo is TipoSolicitud => (conteo.datos[tipo] ?? 0) > 0) : [];
  const menores = vePendientesTutor && tutor.estado === 'listo' ? tutor.datos.total : 0;

  return (
    <Bloque
      id="bloque-pendientes"
      titulo={t('titulo')}
      estado={estado}
      mensajeError={t('error')}
      etiquetaReintentar={t('reintentar')}
      etiquetaCargando={t('cargando')}
      reintentar={() => {
        conteo.reintentar();
        if (vePendientesTutor) tutor.reintentar();
      }}
    >
      {conteo.estado === 'listo' && tipos.length === 0 && menores === 0 ? (
        <p className="flex items-center gap-2">
          <CircleCheckBig aria-hidden className="size-4 shrink-0" />
          {t('vacio')}
        </p>
      ) : (
        <ul className="flex flex-col">
          {conteo.estado === 'listo' &&
            tipos.map((tipo) => {
              const Icono = ICONO_TIPO_SOLICITUD[tipo];
              return (
                <li key={tipo}>
                  <Link href={`/solicitudes?tipo=${tipo}`} className="flex min-h-11 items-center gap-2 underline underline-offset-4">
                    <Icono aria-hidden className="size-4 shrink-0" />
                    {t('linea', { cantidad: conteo.datos[tipo] ?? 0, tipo: tTipos(tipo) })}
                  </Link>
                </li>
              );
            })}
          {menores > 0 && (
            <li>
              <Link href="/pendientes-tutor" className="flex min-h-11 items-center gap-2 underline underline-offset-4">
                <UserRoundCheck aria-hidden className="size-4 shrink-0" />
                {t('pendientesTutor', { cantidad: menores })}
              </Link>
            </li>
          )}
        </ul>
      )}
    </Bloque>
  );
}
