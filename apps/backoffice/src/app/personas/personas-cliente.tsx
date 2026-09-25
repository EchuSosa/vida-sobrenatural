'use client';

import { useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import {
  type ErrorCode,
  type Pagina,
  type PersonaListado,
  type RolDeCargo,
  ROLES_DE_CARGO,
  apiFetch,
  ApiError,
} from '@vida-sobrenatural/shared-types';
import {
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
import { CircleAlert } from 'lucide-react';
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
  const [personaParaRoles, setPersonaParaRoles] = useState<PersonaListado | null>(null);
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
        <div className="flex flex-col gap-0.5">
          <span className="font-medium">
            {persona.apellido}, {persona.nombre}
          </span>
          <span className="break-all text-sm text-muted-foreground md:hidden">{persona.email}</span>
          <span className="text-sm text-muted-foreground sm:hidden">{textoRoles(persona) ?? t('sinRolDeCargo')}</span>
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
              acciones: (persona: PersonaListado) => (
                <Button
                  variant="outline"
                  size="sm"
                  className="max-sm:h-11"
                  aria-label={t('cambiarRolesDe', { nombre: `${persona.nombre} ${persona.apellido}` })}
                  onClick={() => setPersonaParaRoles(persona)}
                >
                  {t('cambiarRoles')}
                </Button>
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
          onCerrar={() => setPersonaParaRoles(null)}
          onCambio={() => router.refresh()}
        />
      )}
    </div>
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
function RolesDialog({
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
    } finally {
      setRolEnCurso(null);
    }
  });

  return (
    <Sheet open={!!persona} onOpenChange={(abierto) => !abierto && onCerrar()}>
      <SheetContent side="right">
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
              const etiquetaRol = t(`roles.${rol}`);
              return (
                <li key={rol} className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-col gap-1">
                    <span className="font-medium">{etiquetaRol}</span>
                    <span className="text-sm text-muted-foreground">{t(`descripcionRoles.${rol}`)}</span>
                    <EstadoActivoBadge activo={tiene} textoActivo={t('modal.tiene')} textoInactivo={t('modal.noTiene')} />
                  </div>
                  {tiene ? (
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
