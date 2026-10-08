'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import {
  type CambioDeRolListado,
  type DiscipuladoActivo,
  type ErrorCode,
  type Pagina,
  type PersonaListado,
  type PropuestaPendiente,
  type RolDeCargo,
  ROLES_DE_CARGO,
  apiFetch,
  ApiError,
  formatearFechaHora,
} from '@vida-sobrenatural/shared-types';
import {
  AvatarPersona,
  Button,
  ConfirmDestructiveDialog,
  ControlesTabla,
  EstadoActivoBadge,
  Paginacion,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  TablaDatos,
  type ColumnaTabla,
  type OrdenTabla,
  useEnvio,
} from '@vida-sobrenatural/ui';
import { toast } from 'sonner';
import { CircleAlert, Lock, Minus, Plus } from 'lucide-react';
import { useControlesTablaUrl } from '../../hooks/use-controles-tabla-url';

function rolesDeCargo(rol: string[]): RolDeCargo[] {
  return ROLES_DE_CARGO.filter((r) => rol.includes(r));
}

/**
 * specs/005, Historia 2 (T028). Mismo reparto que pendientes-tutor-cliente.tsx
 * (H-101): la página ya llega cargada desde page.tsx y acá queda solo lo
 * interactivo — la búsqueda/orden/página en la URL y el modal de roles.
 *
 * `puedeGestionarRoles` sale de `CATALOGO_PERMISOS` en page.tsx: sin el
 * permiso (un Pastor), la tabla se ve igual pero sin la columna de acciones.
 * La columna "Roles de cargo" muestra solo esos cuatro: los roles de estado
 * (`miembro_registrado`, …) los escribe el sistema y no se gestionan acá
 * (D131).
 */
export function PersonasCliente({
  pagina,
  paginaActual,
  totalPaginas,
  apiToken,
  orden,
  puedeGestionarRoles,
}: {
  pagina: Pagina<PersonaListado>;
  paginaActual: number;
  totalPaginas: number;
  apiToken: string;
  orden: OrdenTabla;
  puedeGestionarRoles: boolean;
}) {
  const t = useTranslations('personas');
  const router = useRouter();
  const pathname = usePathname();
  const searchParamsNav = useSearchParams();
  // specs/004, T058: se guarda el id y la Persona se lee de la página actual —
  // después de un `router.refresh()` el panel ve lo que la API dice AHORA
  // (ej. un discipulado que se le asignó mientras el panel estaba abierto).
  const [idParaRoles, setIdParaRoles] = useState<string | null>(null);
  const personaParaRoles = pagina.items.find((p) => p.id === idParaRoles) ?? null;
  const [personaParaHistorial, setPersonaParaHistorial] = useState<PersonaListado | null>(null);
  // Cambiar la búsqueda o el orden vuelve a la página 1 (docs/15, "Listados paginados", punto 4).
  const { busqueda, setBusqueda, actualizarParams, limpiar } = useControlesTablaUrl({
    clavesAReiniciarConBusqueda: ['pagina'],
  });

  function construirHrefPagina(numeroPagina: number): string {
    const params = new URLSearchParams(searchParamsNav);
    if (numeroPagina <= 1) params.delete('pagina');
    else params.set('pagina', String(numeroPagina));
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  function textoRoles(persona: PersonaListado): string | null {
    const roles = rolesDeCargo(persona.rol);
    return roles.length > 0 ? roles.map((r) => t(`roles.${r}`)).join(', ') : null;
  }

  // docs/15, "Cómo colapsa la tabla en celular": ningún dato vive solo en una
  // columna que se oculta, y acá no hay pantalla de detalle donde encontrarlo.
  // Por eso el email (lo que distingue a dos homónimos) y los roles (el motivo
  // de esta pantalla, que un Pastor no ve en ningún otro lado) se repiten
  // debajo del nombre justo en los anchos en que su columna desaparece.
  const columnas: ColumnaTabla<PersonaListado>[] = [
    {
      id: 'apellido',
      encabezado: t('columnas.nombre'),
      ordenable: true,
      celda: (persona) => (
        <div className="flex items-start gap-3">
          {/* spec 013 (T034, FR-010, FR-018): avatar y el nombre como enlace al perfil. */}
          <AvatarPersona nombre={persona.nombre} apellido={persona.apellido} fotoUrl={persona.fotoUrl} tamanio="sm" />
          <div className="flex min-w-0 flex-col gap-0.5">
            <Link href={`/personas/${persona.id}`} className="font-medium underline underline-offset-2">
              {persona.apellido}, {persona.nombre}
            </Link>
            <span className="break-all text-sm text-muted-foreground md:hidden">{persona.email}</span>
            <span className="text-sm text-muted-foreground sm:hidden">{textoRoles(persona) ?? t('sinRolDeCargo')}</span>
          </div>
        </div>
      ),
    },
    {
      id: 'contacto',
      encabezado: t('columnas.contacto'),
      className: 'hidden md:table-cell',
      celda: (persona) => (
        <span className="text-muted-foreground">
          {persona.email}
          {persona.telefono && ` — ${persona.telefono}`}
        </span>
      ),
    },
    {
      id: 'roles',
      encabezado: t('columnas.roles'),
      className: 'hidden sm:table-cell',
      celda: (persona) => textoRoles(persona) ?? <span className="text-muted-foreground">{t('sinRolDeCargo')}</span>,
    },
  ];

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-16">
      <h1 className="text-2xl font-semibold">{t('titulo')}</h1>
      <p className="text-muted-foreground">{t('descripcion')}</p>

      <ControlesTabla
        busqueda={busqueda}
        onBuscarChange={setBusqueda}
        etiquetaBusqueda={t('etiquetaBusqueda')}
        placeholderBusqueda={t('placeholderBusqueda')}
        hayAlgoAplicado={busqueda.trim() !== ''}
        onLimpiar={() => limpiar(['pagina'])}
        cantidadResultados={pagina.total}
      />

      <TablaDatos
        columnas={columnas}
        datos={pagina.items}
        obtenerId={(persona) => persona.id}
        etiqueta={t('etiquetaTabla')}
        mensajeVacio={busqueda.trim() ? t('vacioBusqueda', { busqueda: busqueda.trim() }) : t('vacio')}
        orden={orden}
        onOrdenar={(columnaId) =>
          actualizarParams({
            orden: columnaId === 'apellido' ? null : columnaId,
            dir: orden.columna === columnaId && orden.direccion === 'asc' ? 'desc' : null,
            pagina: null,
          })
        }
        {...(puedeGestionarRoles
          ? {
              encabezadoAcciones: t('columnas.acciones'),
              // Historia 6 (T056): "Historial" pide el mismo permiso que
              // cambiar roles (GET /cambios-de-rol, personas.gestionar_roles).
              acciones: (persona: PersonaListado) => (
                <div className="flex flex-wrap justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="max-sm:h-11"
                    aria-label={t('cambiarRolesDe', { nombre: `${persona.nombre} ${persona.apellido}` })}
                    onClick={() => setIdParaRoles(persona.id)}
                  >
                    {t('cambiarRoles')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="max-sm:h-11"
                    aria-label={t('verHistorialDe', { nombre: `${persona.nombre} ${persona.apellido}` })}
                    onClick={() => setPersonaParaHistorial(persona)}
                  >
                    {t('verHistorial')}
                  </Button>
                </div>
              ),
            }
          : {})}
      />

      <Paginacion
        paginaActual={paginaActual}
        totalPaginas={totalPaginas}
        renderEnlace={(p) => <Link href={construirHrefPagina(p)} />}
        etiquetaNav={t('etiquetaPaginacion')}
      />

      {puedeGestionarRoles && (
        <RolesDialog
          key={personaParaRoles?.id ?? 'cerrado'}
          persona={personaParaRoles}
          apiToken={apiToken}
          onCerrar={() => setIdParaRoles(null)}
          onCambio={() => router.refresh()}
        />
      )}
      {puedeGestionarRoles && (
        <HistorialDialog
          // Clave propia: con 'cerrado' a secas chocaba con la del RolesDialog hermano.
          key={`historial-${personaParaHistorial?.id ?? 'cerrado'}`}
          persona={personaParaHistorial}
          apiToken={apiToken}
          onCerrar={() => setPersonaParaHistorial(null)}
        />
      )}
    </div>
  );
}

const HISTORIAL_TAKE = 100;

/**
 * specs/005, Historia 6 (T056, Acceptance Scenario 3): quién otorgó o quitó
 * cada rol de cargo de esta Persona, y cuándo — lo que devuelve
 * GET /cambios-de-rol. Cuatro estados (Principio VIII): cargando (anunciado
 * a lectores de pantalla), error con Reintentar, vacío y éxito. El vacío
 * aclara que los cambios anteriores a este registro no aparecen: un historial
 * vacío no significa "nunca se tocó". La acción se lee con ícono + texto,
 * nunca solo con color (D81). La fila del comando de recuperación dice en
 * palabras que se hizo fuera de la aplicación (H-141), no una celda vacía.
 */
/** spec 013 (T033): exportado para abrirlo también desde el perfil de la Persona, sin duplicarlo. */
export function HistorialDialog({
  persona,
  apiToken,
  onCerrar,
}: {
  persona: PersonaListado | null;
  apiToken: string;
  onCerrar: () => void;
}) {
  const t = useTranslations('personas');
  const tc = useTranslations('comun');
  const locale = useLocale();
  // Nace en 'cargando' (el diálogo se remonta por persona, key en el padre):
  // el efecto solo pide los datos; "Reintentar" vuelve a 'cargando' desde el
  // clic y suma un intento, que re-dispara el efecto.
  const [estado, setEstado] = useState<'cargando' | 'error' | 'listo'>('cargando');
  const [pagina, setPagina] = useState<Pagina<CambioDeRolListado> | null>(null);
  const [intento, setIntento] = useState(0);
  const nombre = persona ? `${persona.nombre} ${persona.apellido}` : '';

  useEffect(() => {
    if (!persona) return;
    let vigente = true;
    apiFetch<Pagina<CambioDeRolListado>>(`/cambios-de-rol?personaId=${encodeURIComponent(persona.id)}&take=${HISTORIAL_TAKE}`, {
      headers: { Authorization: `Bearer ${apiToken}` },
    })
      .then((resultado) => {
        if (!vigente) return;
        setPagina(resultado);
        setEstado('listo');
      })
      .catch(() => {
        if (vigente) setEstado('error');
      });
    return () => {
      vigente = false;
    };
  }, [persona, apiToken, intento]);

  const reintentar = () => {
    setEstado('cargando');
    setIntento((n) => n + 1);
  };

  const autor = (cambio: CambioDeRolListado) => {
    if (cambio.origen === 'recuperacion_cli') return t('historial.fueraDeLaApp');
    if (!cambio.realizadoPor?.nombre) return t('historial.autorQueYaNoEsta');
    return t('historial.porAdmin', { nombre: `${cambio.realizadoPor.nombre} ${cambio.realizadoPor.apellido ?? ''}`.trim() });
  };

  return (
    <Sheet open={!!persona} onOpenChange={(abierto) => !abierto && onCerrar()}>
      <SheetContent side="right" etiquetaCerrar={tc('cerrarPanel')}>
        <SheetHeader>
          <SheetTitle>{t('historial.titulo', { nombre })}</SheetTitle>
          <SheetDescription>{t('historial.descripcion')}</SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-3 overflow-y-auto px-4" aria-busy={estado === 'cargando'}>
          {estado === 'cargando' && (
            <p role="status" className="text-sm text-muted-foreground">
              {t('historial.cargando')}
            </p>
          )}

          {estado === 'error' && (
            <div role="alert" className="flex flex-col gap-3 rounded-md border border-destructive/40 bg-destructive/10 p-3">
              <p className="flex items-start gap-2 text-sm text-destructive">
                <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                {t('historial.error')}
              </p>
              <Button variant="outline" size="sm" className="w-fit max-sm:h-11" onClick={reintentar}>
                {t('historial.reintentar')}
              </Button>
            </div>
          )}

          {estado === 'listo' && pagina && pagina.items.length === 0 && (
            <div className="flex flex-col gap-1">
              <p className="text-sm">{t('historial.vacio', { nombre })}</p>
              <p className="text-sm text-muted-foreground">{t('historial.notaAntiguedad')}</p>
            </div>
          )}

          {estado === 'listo' && pagina && pagina.items.length > 0 && (
            <>
              <ol className="flex flex-col gap-2">
                {pagina.items.map((cambio) => {
                  const Icono = cambio.accion === 'otorgado' ? Plus : Minus;
                  const etiquetaRol = (ROLES_DE_CARGO as readonly string[]).includes(cambio.rol)
                    ? t(`roles.${cambio.rol as RolDeCargo}`)
                    : cambio.rol;
                  return (
                    <li key={cambio.id} className="flex flex-col gap-1 rounded-md border border-border p-3">
                      <p className="flex items-center gap-2 font-medium">
                        <Icono aria-hidden="true" className="size-4 shrink-0" />
                        {t(`historial.${cambio.accion}`)}: {etiquetaRol}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        <time dateTime={cambio.createdAt}>{formatearFechaHora(cambio.createdAt, locale)}</time>
                      </p>
                      <p className="text-sm text-muted-foreground">{autor(cambio)}</p>
                    </li>
                  );
                })}
              </ol>
              {pagina.total > pagina.items.length && (
                <p className="text-sm text-muted-foreground">
                  {t('historial.masRecientes', { cantidad: pagina.items.length, total: pagina.total })}
                </p>
              )}
              <p className="text-sm text-muted-foreground">{t('historial.notaAntiguedad')}</p>
            </>
          )}
        </div>

        <SheetFooter>
          <Button variant="ghost" className="max-sm:h-11" onClick={onCerrar}>
            {t('historial.cerrar')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/**
 * Un rol por fila, cada uno con su propia acción: la API otorga y quita de
 * a uno (y la Historia 6 audita cada cambio por separado), así que un
 * "Guardar" con varios cambios juntos podría quedar aplicado a medias. El
 * estado de cada rol queda escrito en el modal (texto + ícono, D81) además
 * del toast. Un rechazo de la API se muestra con su mensaje propio, arriba,
 * nunca como un 403 genérico.
 */
// D81: objetivos táctiles de al menos 44 px en celular (`max-sm:h-11`);
// en escritorio quedan del tamaño de las demás tablas del backoffice.
/** spec 013 (T033): exportado para abrirlo también desde el perfil de la Persona, sin duplicarlo. */
export function RolesDialog({
  persona,
  apiToken,
  onCerrar,
  onCambio,
}: {
  persona: PersonaListado | null;
  apiToken: string;
  onCerrar: () => void;
  onCambio: () => void;
}) {
  const t = useTranslations('personas');
  const te = useTranslations('errors');
  const tc = useTranslations('comun');
  // El estado se resetea remontando (key={persona?.id} en el padre), igual que ActivarDialog.
  const [roles, setRoles] = useState<string[]>(persona?.rol ?? []);
  const [rolEnCurso, setRolEnCurso] = useState<RolDeCargo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const nombre = persona ? `${persona.nombre} ${persona.apellido}` : '';

  // H-57: un solo guard para todo el modal — mientras un cambio está en
  // curso no arranca otro, sea del mismo rol o de otro.
  const { enviando, ejecutar: cambiarRol } = useEnvio(async (rol: RolDeCargo, accion: 'otorgar' | 'quitar') => {
    if (!persona) return;
    setError(null);
    setRolEnCurso(rol);
    try {
      const resultado = await apiFetch<{ id: string; rol: string[] }>(
        accion === 'otorgar' ? `/personas/${persona.id}/roles` : `/personas/${persona.id}/roles/${rol}`,
        accion === 'otorgar'
          ? {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiToken}` },
              body: JSON.stringify({ rol }),
            }
          : { method: 'DELETE', headers: { Authorization: `Bearer ${apiToken}` } },
      );
      setRoles(resultado.rol);
      toast(t(accion === 'otorgar' ? 'modal.exitoOtorgado' : 'modal.exitoQuitado', { nombre, rol: t(`roles.${rol}`) }));
      onCambio();
    } catch (e) {
      setError(e instanceof ApiError ? te(e.code as ErrorCode) : t('modal.errorGenerico'));
      // specs/004, T058: si la lista decía que se podía y la API encontró un
      // discipulado o una propuesta (se le asignó recién), se recarga el
      // listado: el panel pasa a nombrarlos, con el enlace a cada uno.
      if (e instanceof ApiError && e.code === 'DISCIPULADOR_TIENE_DISCIPULADOS_ACTIVOS') onCambio();
    } finally {
      setRolEnCurso(null);
    }
  });

  return (
    <Sheet open={!!persona} onOpenChange={(abierto) => !abierto && onCerrar()}>
      <SheetContent side="right" etiquetaCerrar={tc('cerrarPanel')}>
        <SheetHeader>
          <SheetTitle>{t('modal.titulo', { nombre })}</SheetTitle>
          <SheetDescription>{t('modal.descripcion')}</SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 overflow-y-auto px-4">
          {/* Sin fondo teñido a propósito: `text-destructive` sobre
              `bg-destructive/10` da 4.24:1 en oscuro (axe, T029) — no es una
              combinación medida en docs/17. Texto destructivo sobre el fondo
              del panel sí lo es (6.2 / 5.3); el ícono, para no depender del
              color (D81). */}
          {error && (
            <p role="alert" className="flex gap-2 rounded-md border border-destructive px-3 py-2 text-sm text-destructive">
              <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </p>
          )}

          <ul className="flex flex-col gap-3">
            {ROLES_DE_CARGO.map((rol) => {
              const tiene = roles.includes(rol);
              // T062 (D132): "¿tiene el rol?" no alcanza para ofrecer "Quitar" —
              // la pregunta es "¿se le puede quitar, a ella, pedido por mí,
              // ahora?". La responde la API con `puedeQuitarRol` (shared-types),
              // la misma función con la que después rechazaría: la pantalla no
              // ofrece lo que va a fallar. Por los cuatro roles, así sigue
              // valiendo después de otorgar uno acá.
              const quitar = persona?.quitar[rol];
              const etiquetaRol = t(`roles.${rol}`);
              return (
                <li key={rol} className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="font-medium">{etiquetaRol}</span>
                    <span className="text-sm text-muted-foreground">{t(`descripcionRoles.${rol}`)}</span>
                    <EstadoActivoBadge activo={tiene} textoActivo={t('modal.tiene')} textoInactivo={t('modal.noTiene')} />
                    {tiene && quitar && !quitar.puede && (
                      // En lugar del botón, el motivo en palabras (ícono + texto,
                      // D81) — el mismo mensaje con el que la API rechazaría.
                      // Debajo del estado y no en la columna de la acción: ahí
                      // aplastaba la descripción del rol.
                      quitar.motivo === 'DISCIPULADOR_TIENE_DISCIPULADOS_ACTIVOS' ? (
                        <BloqueoDiscipulador discipulados={quitar.discipulados} propuestas={quitar.propuestas} />
                      ) : (
                        <p className="flex items-start gap-2 text-sm text-muted-foreground">
                          <Lock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                          <span>{te(quitar.motivo)}</span>
                        </p>
                      )
                    )}
                  </div>
                  {tiene && quitar && !quitar.puede ? null : tiene ? (
                    <ConfirmDestructiveDialog
                      trigger={
                        <Button
                          variant="outline"
                          size="sm"
                          className="max-sm:h-11"
                          aria-label={t('modal.quitarRol', { rol: etiquetaRol })}
                          loading={enviando && rolEnCurso === rol}
                          disabled={enviando && rolEnCurso !== rol}
                        >
                          {t('modal.quitar')}
                        </Button>
                      }
                      titulo={t('modal.confirmarQuitarTitulo', { rol: etiquetaRol, nombre })}
                      descripcion={t('modal.confirmarQuitarDescripcion')}
                      textoConfirmar={t('modal.confirmarQuitar')}
                      textoCancelar={t('modal.volver')}
                      onConfirmar={() => void cambiarRol(rol, 'quitar')}
                    />
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="max-sm:h-11"
                      aria-label={t('modal.otorgarRol', { rol: etiquetaRol })}
                      loading={enviando && rolEnCurso === rol}
                      loadingText={t('modal.otorgando')}
                      disabled={enviando && rolEnCurso !== rol}
                      onClick={() => void cambiarRol(rol, 'otorgar')}
                    >
                      {t('modal.otorgar')}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        <SheetFooter>
          <Button variant="ghost" className="max-sm:h-11" onClick={onCerrar}>
            {t('modal.cerrar')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/**
 * specs/004, T058 (FR-043, cierra H-127): por qué no se puede quitar
 * `discipulador`, nombrando cada discipulado y cada propuesta, y CÓMO
 * destrabarlo (H-107): cada uno enlaza adonde se resuelve — el discipulado a
 * su Grupo (para reasignarlo), la propuesta a su Solicitud (o a su Grupo, si
 * es una reasignación) para retirarla. Rutas de `config/nav.ts`.
 */
function BloqueoDiscipulador({
  discipulados,
  propuestas,
}: {
  discipulados: DiscipuladoActivo[];
  propuestas: PropuestaPendiente[];
}) {
  const t = useTranslations('personas.modal.bloqueoDiscipulador');
  const nombreDe = (persona: { nombre: string; apellido: string }) =>
    `${persona.nombre} ${persona.apellido}`.trim() || t('personaSinNombre');
  const hrefPropuesta = (p: PropuestaPendiente) =>
    p.solicitudId ? `/solicitudes/${p.solicitudId}` : `/grupos/${p.grupoId}`;
  return (
    <div className="flex items-start gap-2 text-sm text-muted-foreground">
      <Lock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="flex flex-col gap-1">
        <p>{t('intro')}</p>
        <ul className="flex list-disc flex-col gap-1 pl-5">
          {discipulados.map((d) => (
            <li key={d.grupoId}>
              <Link href={`/grupos/${d.grupoId}`} className="text-foreground underline underline-offset-4">
                {t('discipulado', { nombre: nombreDe(d.persona) })}
              </Link>
            </li>
          ))}
          {propuestas.map((p) => (
            <li key={p.propuestaId}>
              <Link href={hrefPropuesta(p)} className="text-foreground underline underline-offset-4">
                {t('propuesta', { nombre: nombreDe(p.persona) })}
              </Link>
            </li>
          ))}
        </ul>
        <p>{t('comoDestrabar')}</p>
      </div>
    </div>
  );
}
