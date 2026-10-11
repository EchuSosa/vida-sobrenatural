import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { ChevronRight, CircleCheck, CircleDashed, Hourglass } from 'lucide-react';
import { ApiError, apiFetch, type EleccionesDeMiGrupo, type EstadoEleccionMinisterio } from '@vida-sobrenatural/shared-types';
import { EstadoVacio, MigaDePan } from '@vida-sobrenatural/ui';
import { requerirPermiso } from '../../../../../auth';
import { textoOpcion } from '../../../../../components/eleccion/texto-opcion';

/**
 * spec 015 (D240): las elecciones de ministerio de la edición, para el líder
 * de Vida de Servicio — quién eligió, qué, y si la charla ya está hecha. Cada
 * fila lleva a la charla de esa persona. Estado en texto + ícono (D81).
 */
export default async function EleccionesPage({ params }: { params: Promise<{ grupoId: string }> }) {
  const session = await requerirPermiso('mis_grupos.ver');
  const { grupoId } = await params;
  const t = await getTranslations('misGrupos.elecciones');
  const tm = await getTranslations('misGrupos');
  let datos: EleccionesDeMiGrupo;
  try {
    datos = await apiFetch<EleccionesDeMiGrupo>(`/vida-de-servicio/mis-grupos/${encodeURIComponent(grupoId)}/elecciones`, {
      headers: { Authorization: `Bearer ${session.apiToken}` },
      cache: 'no-store',
    });
  } catch (e) {
    if (e instanceof ApiError && e.code === 'GRUPO_NO_ENCONTRADO') notFound();
    throw e;
  }
  const charladas = datos.personas.filter((p) => p.eleccion && p.eleccion.estado !== 'borrador').length;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
      <MigaDePan tramos={[{ label: tm('titulo'), href: '/mis-grupos' }, { label: datos.grupo.nombre, href: `/mis-grupos/${datos.grupo.id}` }, { label: t('titulo') }]} LinkComponente={Link} />
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">{t('titulo')}</h1>
        <p className="text-base text-muted-foreground">{t('ayuda')}</p>
        <p className="text-base font-medium">{t('progreso', { hechas: charladas, total: datos.personas.length })}</p>
      </div>
      {datos.personas.length === 0 ? (
        <EstadoVacio mensaje={t('vacio')} />
      ) : (
        <ul className="flex flex-col gap-2">
          {datos.personas.map(({ persona, eleccion }) => (
            <li key={persona.id}>
              <Link
                href={`/mis-grupos/${datos.grupo.id}/elecciones/${persona.id}`}
                className="flex min-h-14 items-center gap-3 rounded-lg border border-border p-3 text-base hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
              >
                <IconoEstado estado={eleccion?.estado ?? null} />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="font-medium break-words underline underline-offset-4">{`${persona.nombre} ${persona.apellido}`}</span>
                  <span className="text-muted-foreground">{t(`estado.${eleccion?.estado ?? 'sin_eleccion'}`)}</span>
                  {eleccion && eleccion.opciones.length > 0 && (
                    <span className="text-muted-foreground break-words">{eleccion.opciones.map(textoOpcion).join(' / ')}</span>
                  )}
                </span>
                <ChevronRight aria-hidden className="size-5 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function IconoEstado({ estado }: { estado: EstadoEleccionMinisterio | null }) {
  if (estado === 'charla_hecha' || estado === 'resuelta') return <CircleCheck aria-hidden className="size-5 shrink-0 text-primary" />;
  if (estado === 'borrador') return <Hourglass aria-hidden className="size-5 shrink-0 text-primary" />;
  return <CircleDashed aria-hidden className="size-5 shrink-0 text-muted-foreground" />;
}
