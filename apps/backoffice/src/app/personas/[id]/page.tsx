import { Suspense, type ReactNode } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { CircleCheck, CircleSlash, Clock, Info, Smartphone, UserRound } from 'lucide-react';
import { ApiError, aniosCongregando, apiFetch, formatearDiaEnArgentina, formatearFechaLarga, hoyEnArgentina, type CaminoDePersonaAdmin, type PerfilPersona } from '@vida-sobrenatural/shared-types';
import { AvatarPersona, ButtonLink, MigaDePan, Skeleton } from '@vida-sobrenatural/ui';
import { requerirPermiso, tienePermisoSesion } from '../../../auth';
import { BloqueConError } from '../../../components/bloque-con-error';
import { PedirEnNombreDe } from '../../../components/pedir-en-nombre-de';
import { SECCIONES_PERFIL } from './secciones';
import { AccionesRoles } from './acciones-roles';
import { SeccionGrupos } from './seccion-grupos';
import { SeccionSolicitudes } from './seccion-solicitudes';

/**
 * spec 013, Historia 2 (T033): la Persona entera en una pantalla (D61, D209).
 * Cabecera y Datos salen de `GET /personas/:id/perfil` (si eso falla, la
 * página entera va a `error.tsx`; si no existe, a `not-found.tsx`). El resto
 * son bloques que cargan y fallan solos (`Suspense` + `BloqueConError`):
 * Solicitudes (la bandeja con `persona=`), Grupos y las secciones que suman
 * otras specs (`SECCIONES_PERFIL`). Las acciones (roles, pedir en su nombre)
 * solo con su permiso: el Pastor lo ve todo, incluido el contacto (D64), sin
 * botones de gestión (D142). "Editar datos" (013, Historia 7) con `personas.editar`.
 */
export default async function PerfilPersonaPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requerirPermiso('personas.ver');
  const { id } = await params;
  let perfil: PerfilPersona;
  try {
    perfil = await apiFetch<PerfilPersona>(`/personas/${id}/perfil`, { headers: { Authorization: `Bearer ${session.apiToken}` }, cache: 'no-store' });
  } catch (e) {
    if (e instanceof ApiError && e.code === 'NO_ENCONTRADO') notFound();
    throw e;
  }

  const t = await getTranslations('perfil');
  const tRaiz = await getTranslations();
  const locale = await getLocale();
  const nombre = `${perfil.nombre} ${perfil.apellido}`;
  const puedeGestionarRoles = tienePermisoSesion(session, 'personas.gestionar_roles');
  // spec 013, Historia 7 (T082, H7.5): "Editar datos" solo con `personas.editar` (el Pastor no lo ve).
  const puedeEditar = tienePermisoSesion(session, 'personas.editar');
  const puedePedirEnNombre = tienePermisoSesion(session, 'solicitudes.crear_en_nombre') && perfil.activo && perfil.estado === 'activa';
  // DEMO-06 (2026-10-10): si ya tiene Vida Nueva pedida, en curso o hecha, no
  // se ofrece pedirla en su nombre (la API lo rechazaría igual): se dice por
  // qué. Si el camino no carga, queda el botón como antes (la API decide).
  let vidaNueva: CaminoDePersonaAdmin['etapas'][number] | undefined;
  if (puedePedirEnNombre) {
    try {
      const camino = await apiFetch<CaminoDePersonaAdmin>(`/personas/${encodeURIComponent(perfil.id)}/camino`, {
        headers: { Authorization: `Bearer ${session.apiToken}` },
        cache: 'no-store',
      });
      vidaNueva = camino.etapas.find((e) => e.etapa === 'vida_nueva');
    } catch {
      vidaNueva = undefined;
    }
  }
  const motivoSinPedir = vidaNueva?.completa ? t('acciones.vidaNuevaHecha') : vidaNueva?.enCurso ? t('acciones.vidaNuevaEnMarcha') : null;
  const seccionesExtra = SECCIONES_PERFIL.filter((s) => tienePermisoSesion(session, s.permiso));
  const anioActual = Number(hoyEnArgentina().slice(0, 4));

  const fecha = (iso: string) => formatearDiaEnArgentina(iso, locale);
  const alta =
    perfil.origenAlta === 'admin'
      ? perfil.altaPor
        ? t('datos.altaAdmin', { nombre: `${perfil.altaPor.nombre} ${perfil.altaPor.apellido}`, fecha: fecha(perfil.createdAt) })
        : t('datos.altaAdminSinNombre', { fecha: fecha(perfil.createdAt) })
      : t('datos.altaAutorregistro', { fecha: fecha(perfil.createdAt) });
  const consentimiento = perfil.consentimiento
    ? t(perfil.consentimiento.origen === 'app' ? 'datos.consentimientoApp' : 'datos.consentimientoPresencial', { fecha: fecha(perfil.consentimiento.fecha) })
    : t('datos.sinConsentimiento');
  const errorBloque = { mensajeError: t('errorSeccion'), etiquetaReintentar: t('reintentar') };

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-16">
      <div className="flex flex-col gap-4">
        <MigaDePan tramos={[{ label: t('miga'), href: '/personas' }, { label: nombre }]} LinkComponente={Link} />
        <div className="flex flex-wrap items-center gap-4">
          <AvatarPersona nombre={perfil.nombre} apellido={perfil.apellido} fotoUrl={perfil.fotoUrl} textoAlternativo={t('fotoDe', { nombre })} tamanio="lg" />
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="text-2xl font-semibold break-words">{nombre}</h1>
            <p className="text-muted-foreground">
              {t('edad', { edad: perfil.edad })} · {perfil.sede.nombre}
            </p>
            <ul className="flex flex-wrap gap-x-4 gap-y-1">
              {!perfil.activo && <Marca icono={<CircleSlash aria-hidden className="size-4" />} texto={t('marcas.dadaDeBaja')} />}
              {perfil.estado === 'pendiente_tutor' ? (
                <Marca icono={<Clock aria-hidden className="size-4" />} texto={t('marcas.pendienteTutor')} />
              ) : (
                perfil.activo && <Marca icono={<CircleCheck aria-hidden className="size-4" />} texto={t('marcas.activa')} />
              )}
              {!perfil.usaLaApp && <Marca icono={<Smartphone aria-hidden className="size-4" />} texto={t('marcas.noUsaLaApp')} />}
              {perfil.tutor && <Marca icono={<UserRound aria-hidden className="size-4" />} texto={t('marcas.menor')} />}
            </ul>
          </div>
        </div>
      </div>

      <Seccion id="datos" titulo={t('secciones.datos')}>
        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
          <Dato termino={t('datos.telefono')}>
            {perfil.telefono.replace(/[^\d+]/g, '') ? (
              <a href={`tel:${perfil.telefono.replace(/[^\d+]/g, '')}`} className="inline-flex min-h-11 items-center underline underline-offset-2">
                {perfil.telefono}
              </a>
            ) : (
              t('datos.sinTelefono')
            )}
          </Dato>
          <Dato termino={t('datos.email')}>{perfil.email ?? t('datos.sinEmail')}</Dato>
          <Dato termino={t('datos.direccion')}>{perfil.direccion}</Dato>
          <Dato termino={t('datos.sede')}>{perfil.sede.activa ? perfil.sede.nombre : t('datos.sedeInactiva', { nombre: perfil.sede.nombre })}</Dato>
          <Dato termino={t('datos.fechaNacimiento')}>{formatearFechaLarga(perfil.fechaNacimiento, locale)}</Dato>
          <Dato termino={t('datos.genero')}>{t(`opciones.genero.${perfil.genero}`)}</Dato>
          <Dato termino={t('datos.estadoCivil')}>{t(`opciones.estadoCivil.${perfil.estadoCivil}`)}</Dato>
          <Dato termino={t('datos.profesion')}>
            {perfil.profesion === 'otro' && perfil.profesionDetalle ? perfil.profesionDetalle : t(`opciones.profesion.${perfil.profesion}`)}
          </Dato>
          <Dato termino={t('datos.congregaDesde')}>
            {t('datos.congregaDesdeValor', { anio: perfil.congregaDesde, anios: aniosCongregando(perfil.congregaDesde, anioActual) })}
          </Dato>
          <Dato termino={t('datos.usaLaApp')}>{perfil.usaLaApp ? t('datos.usaLaAppSi') : t('datos.usaLaAppNo')}</Dato>
          <Dato termino={t('datos.alta')}>{alta}</Dato>
          <Dato termino={t('datos.consentimiento')}>{consentimiento}</Dato>
          {perfil.tutor && (
            <Dato termino={t('datos.tutor')}>
              {perfil.tutor.persona ? (
                <Link href={`/personas/${perfil.tutor.persona.id}`} className="underline underline-offset-2">
                  {`${perfil.tutor.nombre} ${perfil.tutor.apellido}`}
                </Link>
              ) : perfil.tutor.telefono ? (
                t('datos.tutorConTelefono', { nombre: `${perfil.tutor.nombre} ${perfil.tutor.apellido}`, telefono: perfil.tutor.telefono })
              ) : (
                `${perfil.tutor.nombre} ${perfil.tutor.apellido}`
              )}
            </Dato>
          )}
        </dl>
        {puedeEditar && (
          <ButtonLink href={`/personas/${perfil.id}/editar`} variant="outline" size="xl" className="w-fit">
            {t('editarDatos')}
          </ButtonLink>
        )}
      </Seccion>

      <Seccion id="roles" titulo={t('secciones.roles')}>
        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
          <Dato termino={t('roles.deCargo')}>
            {perfil.roles.deCargo.length > 0 ? perfil.roles.deCargo.map((r) => tRaiz(`personas.roles.${r}`)).join(', ') : t('roles.sinDeCargo')}
          </Dato>
          <Dato termino={t('roles.delProceso')}>
            {perfil.roles.delProceso.length > 0
              ? perfil.roles.delProceso.map((r) => (t.has(`roles.nombres.${r}` as 'roles.nombres.miembro_registrado') ? t(`roles.nombres.${r}` as 'roles.nombres.miembro_registrado') : r)).join(', ')
              : t('roles.sinDelProceso')}
          </Dato>
        </dl>
        {puedeGestionarRoles && perfil.activo && <AccionesRoles perfil={perfil} apiToken={session.apiToken} />}
      </Seccion>

      {puedePedirEnNombre && (
        <Seccion id="acciones" titulo={t('secciones.acciones')}>
          {motivoSinPedir ? (
            <p className="flex items-start gap-2 text-muted-foreground">
              <Info aria-hidden className="mt-1 size-4 shrink-0" />
              {motivoSinPedir}
            </p>
          ) : (
            <PedirEnNombreDe apiToken={session.apiToken} persona={{ id: perfil.id, nombre: perfil.nombre, apellido: perfil.apellido }} />
          )}
        </Seccion>
      )}

      <Seccion id="solicitudes" titulo={t('secciones.solicitudes')}>
        <BloqueConError {...errorBloque} mensajeError={t('solicitudes.error')}>
          <Suspense fallback={<EsqueletoLista />}>
            <SeccionSolicitudes personaId={perfil.id} apiToken={session.apiToken} />
          </Suspense>
        </BloqueConError>
      </Seccion>

      <BloqueConError {...errorBloque} mensajeError={t('grupos.error')}>
        <Suspense fallback={<EsqueletoLista />}>
          <SeccionGrupos personaId={perfil.id} apiToken={session.apiToken} />
        </Suspense>
      </BloqueConError>

      <Seccion id="familia" titulo={t('secciones.familia')}>
        {perfil.relaciones.length === 0 ? (
          <p className="text-muted-foreground">{t('familia.vacio')}</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {perfil.relaciones.map((r) => (
              <li key={`${r.relacion}-${r.familiar.id}`} className="flex items-center gap-3">
                <AvatarPersona nombre={r.familiar.nombre} apellido={r.familiar.apellido} fotoUrl={r.familiar.fotoUrl} tamanio="sm" />
                <span>
                  <span className="text-muted-foreground">{t(`familia.relaciones.${r.relacion}`)}: </span>
                  <Link href={`/personas/${r.familiar.id}`} className="font-medium underline underline-offset-2">
                    {`${r.familiar.nombre} ${r.familiar.apellido}`}
                  </Link>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Seccion>

      {seccionesExtra.map(({ clave, tituloKey, Componente }) => (
        <Seccion key={clave} id={clave} titulo={tRaiz(tituloKey as Parameters<typeof tRaiz>[0])}>
          <BloqueConError {...errorBloque}>
            <Suspense fallback={<EsqueletoLista />}>
              <Componente personaId={perfil.id} apiToken={session.apiToken} />
            </Suspense>
          </BloqueConError>
        </Seccion>
      ))}
    </div>
  );
}

function Seccion({ id, titulo, children }: { id: string; titulo: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`seccion-${id}`} className="flex flex-col gap-4">
      <h2 id={`seccion-${id}`} className="text-xl font-semibold">
        {titulo}
      </h2>
      {children}
    </section>
  );
}

function Dato({ termino, children }: { termino: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-muted-foreground">{termino}</dt>
      <dd className="break-words">{children}</dd>
    </div>
  );
}

function Marca({ icono, texto }: { icono: ReactNode; texto: string }) {
  return (
    <li className="inline-flex items-center gap-1.5 font-medium">
      {icono}
      {texto}
    </li>
  );
}

function EsqueletoLista() {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-5 w-1/2" />
    </div>
  );
}
