# Contrato: navegación (web app y backoffice)

## Web app — `apps/web`

### Barra inferior (`config/nav-app.ts`)

Cinco ítems, sin cambios de orden ni de cantidad (`docs/14` §2). `ItemNavApp` suma
`rutasRelacionadas?: string[]` para marcar la pestaña actual:

```ts
{ href: '/mi-camino', labelKey: 'miCamino', icon: MapIcon,
  rutasRelacionadas: ['/mi-camino', '/mis-discipulados', '/mi-disponibilidad'] }
```

`aria-current="page"` cuando la ruta actual empieza con alguna de esas (FR-023).

### Selector de Mi camino (`SUBNAV_MI_CAMINO`)

```ts
export const SUBNAV_MI_CAMINO: Array<{ href: string; labelKey: string; permiso: Permiso | 'cualquier-sesion' }> = [
  { href: '/mi-camino', labelKey: 'miCamino', permiso: 'cualquier-sesion' },
  { href: '/mis-discipulados', labelKey: 'misDiscipulados', permiso: 'mis_discipulados.ver' },
  // La spec de Vida de Servicio suma: { href: '/mis-grupos', labelKey: 'misGrupos', permiso: 'mis_grupos.ver' }
];
```

- Se muestra solo si la sesión ve **dos o más** ítems (un selector de una opción es ruido, mismo
  criterio que FR-025 de la 004).
- Es un `<nav aria-label="Secciones de Mi camino">` con enlaces reales (`<a href>`) y
  `aria-current="page"`, objetivos de 44 px (D150), sin depender del color para el activo
  (subrayado + peso).
- Aparece en `/mi-camino`, `/mis-discipulados` y `/mi-disponibilidad` (en esta, con
  "Mis discipulados" activo).

### Rutas

| Ruta | Pantalla | Permiso | Sin permiso |
|---|---|---|---|
| `/mi-camino` | cards de etapas | sesión `activa` | (layout de la app) |
| `/mi-camino/vida-nueva` | Vida Nueva de la 004 | sesión `activa` | (layout) |
| `/mis-discipulados` | lista + pendientes + "Pedir en nombre de…" | `mis_discipulados.ver` | `redirect('/mi-camino')` |
| `/mis-discipulados/[id]` | detalle, Encuentros | `mis_discipulados.ver` (+ pertenencia en la API) | `redirect('/mi-camino')`; ajeno → `notFound()` |
| `/mi-disponibilidad` | agenda, toggle, máximo, períodos | `mi_disponibilidad.ver` | `redirect('/mi-camino')` |

`requerirPermiso(permiso)` en `apps/web/src/auth.ts`: resuelve con `tienePermiso(session.user.rol,
permiso)` de `shared-types`; sin permiso redirige a `/mi-camino` (en el backoffice la misma
función muestra 404/terminal: distinto destino, misma regla).

### Migas de pan (`docs/15`, H-81)

- `/mi-camino/vida-nueva`: Mi camino › Vida Nueva
- `/mis-discipulados`: Mi camino › Mis discipulados
- `/mis-discipulados/[id]`: Mi camino › Mis discipulados › {nombre de la Persona}
- `/mi-disponibilidad`: Mi camino › Mis discipulados › Mi disponibilidad

### Inicio — aviso de pendientes (FR-022)

Server component: si la sesión tiene `mis_discipulados.ver`, pide `GET
/discipulado/mis-discipulados` (endpoint existente, sin cambios) y cuenta propuestas pendientes +
finalizaciones/bajas rechazadas no vueltas a proponer (la misma función `pendientesDelDiscipulador`
que usa Mis discipulados; pura, en `packages/shared-types/src/discipulado.ts`, testeada desde
`apps/api/test/unit/`). Si es > 0, una tarjeta con ícono + texto ("Tenés
{n, plural, one {# cosa} other {# cosas}} para revisar en tus discipulados") que enlaza a
`/mis-discipulados`. Si la llamada falla, el aviso no se muestra y el Inicio sigue (no rompe la
pantalla por algo secundario).

## Backoffice — `apps/backoffice`

### `NAV_BACKOFFICE`

- **Salen**: `/mis-discipulados`, `/mis-discipulados/[id]`, `/mi-disponibilidad`, `/mis-grupos`.
- **Entran** (con `enMenu: false`, para el recorrido de axe): `/personas/nueva`
  (`personas.alta`), `/solicitudes/historial/[id]` (`solicitudes.ver`).

### Redirecciones (research #14) — `redirects()` en `apps/backoffice/next.config.ts`; las cuatro páginas se borran

| Ruta vieja | Destino |
|---|---|
| `/mis-discipulados` | `${NEXT_PUBLIC_WEB_APP_URL}/mis-discipulados` |
| `/mis-discipulados/[id]` | `${NEXT_PUBLIC_WEB_APP_URL}/mis-discipulados/[id]` |
| `/mi-disponibilidad` | `${NEXT_PUBLIC_WEB_APP_URL}/mi-disponibilidad` |
| `/mis-grupos` | `${NEXT_PUBLIC_WEB_APP_URL}/mi-camino` |

Sin exigir sesión antes de redirigir (corren antes del layout; la web app pide la suya).

### Pantalla terminal (FR-025)

Cuando `itemDeAterrizaje(roles) === null`, por **permiso** (nunca rol literal, D132): con
`mis_discipulados.ver` → título "Lo tuyo está en la app", texto "Tus discipulados y tu
disponibilidad ahora se manejan desde la app, también en el celular."; con `mis_grupos.ver` (sin
el anterior) → "Lo tuyo está en la app" con un texto genérico; en los dos, botón principal "Ir a la
app" (`NEXT_PUBLIC_WEB_APP_URL/mi-camino`). Sin ninguno → el texto actual de H-134. Nunca
`redirect` (bucle).

### Personas (`/personas`)

- Botón principal de la pantalla: "Dar de alta una persona" (solo con `personas.alta`).
- Por fila: insignia "Sin acceso a la app" (ícono + texto) si `sinAccesoALaApp`; acciones "Etapas"
  (panel lateral: estado de las cuatro etapas, registrar una etapa hecha, anular — con
  `completitud_manual.gestionar`; solo lectura con `personas.ver`) y "Agregar email" (con
  `personas.editar_email`, solo si no tiene).

### Solicitudes (`/solicitudes`)

- Filtro por tipo visible ("Vida Nueva", "Historial previo").
- Fila `historial` → `/solicitudes/historial/[id]`: datos, comentario, contexto, y "Confirmar" (acción
  principal) / "No confirmar" (secundaria, abre motivo opcional; confirmación neutra, D151).
