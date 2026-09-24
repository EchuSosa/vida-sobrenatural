# Contract: Configuración de navegación (para features futuras)

> **Actualizado por el spec 005 (2026-09-24).** Este contrato está escrito para que una feature futura sepa cómo sumarse a un menú, así que se mantiene al día en vez de quedar como registro histórico. El ítem del backoffice **ya no lleva un arreglo `roles`**: lleva un `permiso`, y los roles que ese permiso habilita viven en `CATALOGO_PERMISOS` (`packages/shared-types/src/permisos.ts`, D132). El resto del contrato —los tres menús, la web pública, la app con sesión— sigue vigente tal cual.

Este es el "contrato" que permite que una feature futura se agregue a uno de los tres menús sin
tocar el layout ni el componente de navegación — el objetivo explícito de este spec (Historia 1,
"dejar lista la base común"). Ver `research.md`, Decisión 11.

## Web pública — `apps/web/src/config/nav-publica.ts`

```ts
interface ItemNavPublica {
  href: string;        // ej. "/ministerios"
  labelKey: string;    // clave en messages/es.json, namespace "nav"
  destacado?: boolean; // true solo para "Dar" / "Ingresar" (se renderizan como botón, no como link de menú)
}
```

Agregar una sección nueva a la web pública = agregar un elemento a este array + crear la página en
`(publica)/<href>/page.tsx`. Si la feature todavía no tiene contenido, la página usa
`<EstadoVacio />` de `packages/ui` en vez de quedar sin crear (FR-005).

## App con sesión — `apps/web/src/config/nav-app.ts`

```ts
interface ItemNavApp {
  href: string;
  labelKey: string;
  icon: LucideIcon; // se muestra siempre junto al texto, nunca solo el ícono (FR-015)
}
```

Mismo criterio: una pestaña nueva = un elemento acá + una página en `(app)/<href>/page.tsx`.

## Backoffice — `apps/backoffice/src/config/nav.ts`

```ts
interface ItemNavBackoffice {
  href: string;
  labelKey: string;
  icon: LucideIcon;
  permiso: Permiso | 'cualquier-sesion'; // D132 — los roles salen de CATALOGO_PERMISOS[permiso]
}
```

El layout del backoffice resuelve `CATALOGO_PERMISOS[permiso]` y filtra el resultado contra `session.user.rol` (ya presente en la sesión, sin
llamada adicional a la API) y muestra la unión de ítems cuando una Persona tiene más de un rol —
nunca hay que tocar el componente de menú para que una Persona con un rol nuevo vea sus ítems: basta
con que su `rol` incluya el valor correspondiente en la base.

## Regla común a los tres

- Ningún ítem se agrega directamente en el JSX del layout — siempre pasa por uno de estos tres
  arrays, para que agregar/quitar una sección sea un cambio de datos, no de estructura.
- El ítem de la sección actual se marca con `aria-current="page"` a partir de comparar `href` con la
  ruta activa (FR-009) — responsabilidad del componente de menú que consume el array, no de cada
  feature.
