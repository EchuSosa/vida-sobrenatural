import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { CircleAlert, CircleMinus, Hourglass, House, UsersRound } from 'lucide-react';
import { apiFetch, type EstadoMiGrupoExtension } from '@vida-sobrenatural/shared-types';
import { ButtonLink, CardEtapa, type CardEtapaProps, textoHorario, textoNombres } from '@vida-sobrenatural/ui';

const ICONO = 'text-primary';
const ICONO_NEUTRO = 'text-muted-foreground';

/**
 * spec 014 (D224): la card "Mi grupo de extensión" de Mi camino, aparte de las
 * cuatro etapas. Dice en qué está la persona (sin grupo, pedido en espera,
 * integrante), con texto + ícono (D81), y lleva a `/mi-camino/grupo-extension`.
 * Si la API falla, lo atrapa el `error.tsx` de Mi camino.
 */
export async function TarjetaGrupoExtension({ apiToken }: { apiToken: string }) {
  const [t, tg] = await Promise.all([getTranslations('grupoExtension.card'), getTranslations('grupoExtension')]);
  const estado = await apiFetch<EstadoMiGrupoExtension>('/grupos-extension/me', {
    headers: { Authorization: `Bearer ${apiToken}` },
    cache: 'no-store',
  });
  const destino = <Link href="/mi-camino/grupo-extension" />;

  let props: Pick<CardEtapaProps, 'estado' | 'enlace' | 'aviso'>;
  switch (estado.estado) {
    case 'integrante':
      props = {
        estado: {
          icono: <UsersRound className={ICONO} />,
          texto: t('integranteTitulo', { grupo: estado.grupo.nombre }),
          detalle: textoHorario(estado.grupo.dias, estado.grupo.horaInicio, tg),
        },
        enlace: { render: destino, texto: t('verGrupo') },
      };
      break;
    case 'pendiente':
      props = {
        estado: {
          icono: <Hourglass className={ICONO} />,
          texto: t('pendienteTitulo', { grupo: estado.grupo.nombre }),
          detalle: t('pendienteTexto', { lideres: textoNombres(estado.grupo.lideres, tg) }),
        },
        enlace: { render: destino, texto: t('verPedido') },
      };
      break;
    case 'sin_grupo': {
      const u = estado.ultima;
      props = {
        aviso:
          u && u.estado !== 'retirada' ? (
            <div role="note" className="flex gap-3 rounded-md border border-border p-3">
              {u.estado === 'rechazada' ? (
                <CircleAlert aria-hidden className={`mt-0.5 size-5 shrink-0 ${ICONO_NEUTRO}`} />
              ) : (
                <CircleMinus aria-hidden className={`mt-0.5 size-5 shrink-0 ${ICONO_NEUTRO}`} />
              )}
              <div className="flex flex-col gap-1 text-base">
                <p className="font-medium">{t(u.estado === 'rechazada' ? 'rechazadaTitulo' : 'finalizadaTitulo', { grupo: u.grupo })}</p>
                <p className="text-muted-foreground">{t(u.estado === 'rechazada' ? 'rechazadaTexto' : 'finalizadaTexto')}</p>
              </div>
            </div>
          ) : undefined,
        estado: { icono: <House className={ICONO} />, texto: t('sinGrupoTitulo'), detalle: t('sinGrupoTexto') },
        enlace: {
          render: destino,
          texto: t('buscar'),
        },
      };
      break;
    }
  }

  return (
    <CardEtapa id="grupo-extension" titulo={t('titulo')} descripcion={t('descripcion')} {...props}>
      {estado.lidera > 0 && (
        <ButtonLink render={<Link href="/mi-grupo-extension" />} variant="outline" size="xl" className="w-full text-base sm:w-fit">
          <UsersRound aria-hidden />
          {t('liderEnlace')}
        </ButtonLink>
      )}
    </CardEtapa>
  );
}
