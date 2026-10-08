export { cn } from './lib/utils';
export { useIsMobile } from './hooks/use-mobile';
export { useEnvio } from './hooks/use-envio';
export { useValidacionCampos, type ValidacionCampo } from './hooks/use-validacion-campos';
export { EstadoVacio, type EstadoVacioProps } from './components/estado-vacio';
export { EstadoActivoBadge, type EstadoActivoBadgeProps } from './components/estado-activo-badge';
export { PlaceholderImagen, type PlaceholderImagenProps } from './components/placeholder-imagen';
export { Marca, type MarcaProps } from './components/marca';
export { MigaDePan, type MigaDePanProps, type TramoMiga } from './components/miga-de-pan';
export { PasoIndicador, type PasoIndicadorProps } from './components/paso-indicador';
export { CampoTelefono, OPCIONES_CODIGO_PAIS } from './components/campo-telefono';
export { CampoAutocompletado, type CampoAutocompletadoProps } from './components/campo-autocompletado';
export { MarkdownSeguro, type MarkdownSeguroProps } from './components/markdown-seguro';
export { EditorMarkdown, type EditorMarkdownProps, type EtiquetasEditorMarkdown } from './components/editor-markdown';
export { CampoFecha, componerFecha, partirFecha, type CampoFechaProps, type EtiquetasCampoFecha } from './components/campo-fecha';
export { CampoHora, type CampoHoraProps, type EtiquetasCampoHora } from './components/campo-hora';
export { EditorDeFranjas, minutosAHHMM, type EditorDeFranjasProps, type EtiquetasEditorFranjas } from './components/editor-de-franjas';
export { EntrarDePrueba, EMAILS_DE_PRUEBA, type EtiquetasEntrarDePrueba } from './components/entrar-de-prueba';
export { ResumenErrores, MensajeErrorCampo, type ErrorResumen } from './components/form-errors';
export {
  ConfirmDestructiveDialog,
  type ConfirmDestructiveDialogProps,
} from './components/confirm-destructive-dialog';
export { MenuUsuario, type MenuUsuarioProps, type OpcionTemaMenu } from './components/menu-usuario';
export {
  TablaDatos,
  type TablaDatosProps,
  type ColumnaTabla,
  type OrdenTabla,
  TablaEsqueleto,
  type TablaEsqueletoProps,
} from './components/tabla-datos';
export {
  ControlesTabla,
  type ControlesTablaProps,
  type OrdenManualControlesProps,
} from './components/controles-tabla';
export { Paginacion, type PaginacionProps } from './components/paginacion';
export {
  HeroConFoto,
  type HeroConFotoProps,
  HeroConFotoBoton,
  type HeroConFotoBotonProps,
} from './components/hero-con-foto';
export { Button, buttonVariants } from './components/ui/button';
export { ButtonLink, type ButtonLinkProps } from './components/ui/button-link';
export { Input } from './components/ui/input';
export { Separator } from './components/ui/separator';
export { Skeleton } from './components/ui/skeleton';
export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from './components/ui/tooltip';
export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
} from './components/ui/sheet';
export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from './components/ui/sidebar';
export {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuIndicator,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
  NavigationMenuPositioner,
} from './components/ui/navigation-menu';
export {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from './components/ui/dropdown-menu';
export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './components/ui/alert-dialog';
export { Toaster } from './components/ui/sonner';

// Lote 0 global (specs/IMPLEMENTACION.md): cada spec exporta sus componentes
// nuevos SOLO en su bloque, para que las sesiones en paralelo no choquen.
// --- spec 006 (CardEtapa, PedirEnNombreDe) ---
export { CardEtapa, type CardEtapaProps } from './components/card-etapa';
export { DialogoTextoOpcional, type DialogoTextoOpcionalProps } from './components/dialogo-texto-opcional';
export { PanelMotivo, type TextosPanelMotivo } from './components/panel-motivo';
export { mensajeDeError, mensajesDeCampo, nombresDe, textoFranja, type Traductor } from './lib/discipulado-comun';
export { PedirEnNombreDe, type PedirEnNombreDeProps, type EtiquetasPedirEnNombreDe, type PersonaElegible } from './components/pedir-en-nombre-de';

// --- spec 007 (FormularioIngresoCodigo, BotonIngresarGoogle) ---

// --- spec 008 (EstadoSemana) ---

// --- spec 009 (AvisoEstado) ---

// --- spec 010 ---

// --- spec 011 (EstadoInscripcionBadge, CampoArchivo) ---
export { CampoArchivo, type CampoArchivoProps } from './components/campo-archivo';
export { EstadoInscripcionBadge, type EstadoInscripcionBadgeProps, type EstadoParaBadge } from './components/estado-inscripcion-badge';

// --- spec 012 ---

// --- spec 013 (AvatarPersona, BarraProporcion, FormularioComentario) ---
export { AvatarPersona, type AvatarPersonaProps } from './components/avatar-persona';
export { BarraProporcion, type BarraProporcionProps } from './components/barra-proporcion';

// --- ajustes-ux (D150, D151) ---
