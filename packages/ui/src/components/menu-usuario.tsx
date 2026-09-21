'use client';

import { useState, type ComponentType, type ReactElement } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { useEnvio } from '../hooks/use-envio';

export interface OpcionTemaMenu {
  value: string;
  label: string;
  Icono: ComponentType<{ className?: string }>;
}

export interface MenuUsuarioProps {
  /** Elemento que abre el menú — varía por superficie (nombre de la sesión, o ícono + "Perfil" de la barra de la app). */
  trigger: ReactElement;
  ariaLabel?: string;
  /**
   * Ítem "Perfil", ya armado (ej. `<Link href="/perfil">Perfil</Link>`) — se
   * omite en el backoffice, que no tiene pantalla de Perfil propia
   * (docs/14-navegacion.md sección 3: ahí el menú es solo tema y cerrar
   * sesión).
   */
  perfil?: ReactElement;
  labelColoresDeLaApp: string;
  opcionesTema: OpcionTemaMenu[];
  temaSeleccionado: string;
  onElegirTema: (value: string) => Promise<void> | void;
  labelCerrarSesion: string;
  onCerrarSesion: () => void;
}

/**
 * H-58 (revisión manual): un solo menú de usuario para las tres superficies
 * que lo repetían con estructuras distintas — apps/web `MenuUsuarioPublico`
 * (header público), apps/web `NavAppPerfilMenu` (barra de la app, H-47) y
 * apps/backoffice `MenuUsuario` — la última todavía con "Cerrar sesión"
 * afuera del desplegable, como botón suelto (contradice
 * docs/14-navegacion.md sección 1 y lo que pedía H-38: H-47 ya había
 * corregido el patrón en la barra de la app, pero nunca llegó a las otras
 * dos). Acá "Cerrar sesión" es una fila más del propio `DropdownMenu`: el
 * ítem cierra el menú primero (estado controlado) y recién ahí abre un
 * `AlertDialog` aparte, también controlado — nunca anidado (H-11/H-47,
 * conflicto de overlays entre `Menu` y `AlertDialog` de Base UI).
 *
 * H-57 (docs/15-guia-ux-ui.md, "acción en curso"): elegir tema y cerrar
 * sesión persisten contra la API — los dos usan `useEnvio` para bloquear un
 * reintento mientras el primero sigue en curso.
 */
export function MenuUsuario({
  trigger,
  ariaLabel,
  perfil,
  labelColoresDeLaApp,
  opcionesTema,
  temaSeleccionado,
  onElegirTema,
  labelCerrarSesion,
  onCerrarSesion,
}: MenuUsuarioProps) {
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [confirmarCerrarSesion, setConfirmarCerrarSesion] = useState(false);
  const { enviando: eligiendoTema, ejecutar: elegirTema } = useEnvio(async (value: string) => {
    await onElegirTema(value);
  });
  const { enviando: cerrandoSesion, ejecutar: cerrarSesion } = useEnvio(async () => {
    onCerrarSesion();
  });

  return (
    <>
      <DropdownMenu open={menuAbierto} onOpenChange={setMenuAbierto}>
        <DropdownMenuTrigger render={trigger} />
        <DropdownMenuContent align="end" aria-label={ariaLabel}>
          {perfil && (
            <>
              <DropdownMenuItem render={perfil} />
              <DropdownMenuSeparator />
            </>
          )}
          <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">{labelColoresDeLaApp}</div>
          {opcionesTema.map(({ value, label, Icono }) => (
            <DropdownMenuItem
              key={value}
              data-active={temaSeleccionado === value}
              aria-disabled={eligiendoTema || undefined}
              onClick={() => {
                if (eligiendoTema) return;
                void elegirTema(value);
              }}
            >
              <Icono className="size-4" aria-hidden="true" />
              {label}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => {
              setMenuAbierto(false);
              setConfirmarCerrarSesion(true);
            }}
          >
            {labelCerrarSesion}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmarCerrarSesion} onOpenChange={setConfirmarCerrarSesion}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cerrar sesión?</AlertDialogTitle>
            <AlertDialogDescription>
              Vas a tener que volver a autorizar el acceso con tu cuenta de Google para entrar de nuevo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction
              loading={cerrandoSesion}
              loadingText="Cerrando sesión…"
              onClick={() => void cerrarSesion()}
            >
              Sí, cerrar sesión
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
