"use client"

import * as React from "react"
import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import type { VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { buttonVariants } from "./button"

/**
 * H-100/H-01 (revisión manual): un `<a>` DE VERDAD, con las mismas
 * variantes visuales que `Button` (reusa `buttonVariants`, no copia
 * clases) — pero SIN pasar por el primitivo `Button` de Base UI, que es
 * justamente lo que dispara el warning de `nativeButton`/gestiona el
 * elemento como si fuera un botón. Un enlace que navega tiene que seguir
 * siendo un enlace: anunciado como tal a un lector de pantalla, que se
 * pueda abrir en pestaña nueva, copiar la dirección — nada de eso viene
 * gratis si el componente que lo renderiza está pensado para un botón.
 *
 * `render` sigue el mismo patrón polimórfico que ya usa el resto de la
 * librería (`useRender` de Base UI, pero no su `Button`) — es así como se
 * pasa un `next/link` sin que `packages/ui` tenga que depender de Next
 * (docs/10-stack-tecnico.md):
 *
 * ```tsx
 * <ButtonLink render={<Link href="/sedes" />}>Crear una Sede</ButtonLink>
 * ```
 *
 * Sin `render`, renderiza un `<a>` liso — sigue haciendo falta `href`.
 */
export interface ButtonLinkProps
  extends useRender.ComponentProps<"a">,
    VariantProps<typeof buttonVariants> {}

function ButtonLink({
  render = <a />,
  className,
  variant,
  size,
  ...props
}: ButtonLinkProps) {
  return useRender({
    defaultTagName: "a",
    render,
    state: { slot: "button-link" },
    props: mergeProps<"a">(
      {
        className: cn(buttonVariants({ variant, size, className })),
      },
      props
    ),
  })
}

export { ButtonLink }
