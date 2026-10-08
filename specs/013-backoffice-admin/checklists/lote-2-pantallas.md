# Checklist de pantallas — lote 2 (T036, T037, T037a, T027a)

Verificación contra el "Checklist por pantalla" de `docs/15-guia-ux-ui.md` (D114). Cómo se verificó:
a mano (código y pantalla levantada con los datos de demo, a 1280 y 360 px, claro y oscuro, Admin y
Pastor) y con los e2e `perfil-persona.spec.ts` y `bandeja.spec.ts`.

## `/personas/[id]` (Perfil de Persona) — T036

- [x] **Una sola acción principal:** el perfil es de lectura; para el Admin la principal es "Pedir
  Vida Nueva en nombre de…" (relleno, de la 004). "Cambiar roles" es de contorno e "Historial" fantasma.
  El Pastor no tiene ninguna acción (e2e H2.6).
- [x] **Cuatro estados, por bloque (D209):** `loading.tsx` con la forma de la cabecera; `error.tsx`
  con código de referencia y "Reintentar" si no carga el perfil; `not-found.tsx` propio ("No
  encontramos esta Persona", con enlace a Personas, H2.8); Solicitudes, Grupos y las secciones de otras
  specs con `Suspense` + `BloqueConError` (su error con "Reintentar" no tumba al resto); vacíos con
  texto ("Todavía no pidió nada.", "Todavía no cursó ningún Grupo.", "No tiene Relaciones Familiares
  cargadas.").
- [x] **Reentrada (H-57):** las acciones son los paneles existentes (roles, pedir en nombre de), que
  ya usan `useEnvio`.
- [x] **Feedback / qué pasa después:** el panel de roles refresca el perfil al cambiar (`router.refresh`).
- [x] **Tono:** voseo, sin jerga: "Viene a la iglesia: desde 2019 (hace 7 años)", "Se registró en la
  app el…", "Lo dio su tutor/a en persona…", "No: no tiene email para entrar".
- [x] **Celular (D150, H2.9):** a 360 px sin scroll horizontal; etiquetas (`dt`) y botones de 16 px,
  botones y el teléfono de 44 px (medidos en el e2e `@celular`).
- [x] **Teclado y lector:** cada bloque es una `section` con su `h2`; datos en `dl`; marcas (Activa,
  Dada de baja, Pendiente de tutor, No usa la app, Menor de edad) en texto + ícono `aria-hidden` (D81);
  la foto con `alt="Foto de <nombre>"` y las iniciales con `role="img"` y el mismo nombre; enlaces
  subrayados.
- [x] **Contraste claro y oscuro:** axe sin violaciones en los dos temas; las iniciales usan el par
  `secondary`/`secondary-foreground` de `docs/17` (ya medido para el placeholder de imágenes).
- [x] **Miga de pan:** `Personas › Nombre`, arriba del `h1`; sin miga en el 404.

## `/personas` (listado) — T037

- [x] Avatar decorativo (`alt=""`, el nombre está al lado) y el nombre como enlace subrayado al
  perfil; el resto del listado sin cambios. En celular el avatar sigue (8 × 8, no fuerza scroll).

## Grupos (listado y detalle), Pendientes de tutor — T037a

- [x] Solo cambió que los nombres (Personas, Discipulador, historial de Discipuladores) son enlaces
  subrayados al perfil (`EnlacePersona`, uno solo para todo el backoffice). Foco visible por defecto
  del enlace; sin colores nuevos.

## Detalle de una Solicitud de Discipulado — T027a

- [x] Suma "Ver el perfil de <nombre>" debajo del estado: un enlace real, subrayado.

## `/solicitudes` (bandeja), cambios del lote 2

- [x] El nombre de la Persona lleva al perfil (con avatar desde `sm`); "Ver" sigue llevando al
  detalle — dos destinos con dos nombres accesibles distintos.

## Observaciones

1. El botón de `PedirEnNombreDe` (004/006) dice "Pedir Vida Nueva en nombre de…" también en el
   perfil, donde la Persona ya está elegida; el panel sí la nombra ("Pedir Vida Nueva para…"). Cambiar
   el texto del botón es del componente, que mueve la 006 a `packages/ui`.
