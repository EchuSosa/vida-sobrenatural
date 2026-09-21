# Vida Sobrenatural — reglas de la casa

Esto no reemplaza a la Constitución (`.specify/memory/constitution.md`) ni a la documentación de
`docs/`: es la lista corta de lo que **más veces se rompió**, para que se lea al empezar, sin que
nadie tenga que acordarse de pegarla. Cada línea dice dónde vive la regla completa.

## Antes de escribir código

- **Spec primero.** Ninguna funcionalidad sin spec o ADR aprobada (Principio I). El índice de la
  documentación está en `docs/00-README.md`.
- **Una sola fuente de verdad** (Principio XI): lo que usan dos apps vive en
  `packages/shared-types` (valores y tipos) o `packages/ui` (componentes). **Nada se copia entre
  apps.** Antes de escribir un componente o un helper, buscá si ya existe ahí.
- **Antes de agregar una decisión a `docs/05-decisiones.md` o un documento a `docs/`, mirá el
  último número usado** — se trabaja en paralelo desde claude.ai y Claude Code (D89, D103).

## Toda pantalla

- **Cuatro estados: cargando, vacío, error y éxito** (Principio VIII, `docs/15-guia-ux-ui.md`).
  En Next, "cargando" es `loading.tsx` y "error" es `error.tsx`, no un `useState` a mano.
- **Los botones que disparan una acción** quedan bloqueados y con indicador de carga mientras se
  procesa, y el envío se protege de la reentrada: usá `useEnvio` y el `Button` de `packages/ui`
  (H-57). El guard va en el envío, no solo en el botón.
- **Los errores de validación se muestran por campo**, con la pieza compartida de `packages/ui`
  (H-50): mensaje debajo del campo, resumen arriba con enlace a cada uno, foco al resumen, y
  decir *cómo* corregir. La API ya manda `errors: [{campo, code}]`.
- **Cada pantalla nueva o modificada lleva su tarea de checklist** del final de
  `docs/15-guia-ux-ui.md` en el `tasks.md` (definición de terminado, D114).

## Colores y accesibilidad

- **Todos los colores salen de tokens.** Nunca `text-zinc-*`, `bg-gray-*` ni ninguna clase de
  color cruda de Tailwind (D118, `docs/17-paleta-y-tokens.md`, H-54). Si un token no existe, se
  agrega al tema, no se escribe el color a mano.
- **Ningún estado ni ningún enlace se comunica solo con color**: siempre texto + ícono, o
  subrayado permanente (D81, H-55).
- **Contraste verificado en los dos temas**, incluido el estado `hover` (H-56). Los valores
  medidos están en `docs/17-paleta-y-tokens.md` — no se ajustan a ojo.
- Los e2e de flujos críticos corren `axe` en modo claro y oscuro.

## Textos

- Ningún texto de interfaz fijo en el código: todo sale de `next-intl` (D84).
- Español rioplatense, con voseo, cálido y claro — el público incluye gente mayor y gente que
  recién llega. El tono está en `docs/15-guia-ux-ui.md` y el contenido real en
  `docs/12-contenido-bienvenida.md`.
- Nombres del dominio siempre como están en `docs/04-dominio-entidades.md` (Principio II).

## Antes de cerrar una fase o un lote

- **Las tres suites en verde**: `pnpm --filter api run test`, `pnpm --filter api run test:e2e`
  (integración, config aparte) y los e2e de `apps/web` y `apps/backoffice` (`docs/00-README.md`).
- Un test que rompe por un cambio de modelo **se arregla en el mismo commit que el cambio**, no
  se hereda en rojo.
- Commits en español, uno por hallazgo o por cambio coherente. **No pushear** salvo pedido
  explícito.
- Terminar cada mensaje de commit con:

  ```
  Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01AeCEMfgZHfubDRLhFtQ6pa
  ```

## Entorno

- Puertos fijos: `apps/web` 3001, `apps/backoffice` 3002, `apps/api` 3333 (D104).
- Cómo levantar todo y cómo dejar la base en condiciones: `specs/revision-manual/COMO-ARRANCAR.md`.
- `packages/shared-types` se compila: si editás un tipo compartido con los servidores levantados,
  hay que reconstruirlo (H-33).
