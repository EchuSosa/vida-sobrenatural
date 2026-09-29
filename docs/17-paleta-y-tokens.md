# Paleta y tokens de color

> **Aplicada** en `f3622ad` (tokens) — D118. Propuesta concreta para aprobar o rechazar mirándola. Deriva de `09-notas-identidad-visual.md`
> (paleta del libro *Vida de Servicio*) y respeta D81 (contrastes WCAG 2.2 AA), D95 y D106
> (modo claro por defecto, ambos modos verificados). Todos los contrastes de este documento
> están **medidos**, no estimados.
>
> **D123 (enmienda, H-86):** `--accent` volvió a ser el neutro de hover que shadcn/Base UI
> esperan de ese token — D118 le había puesto el celeste, y varios componentes vendorizados que
> ya usaban `--accent` para su hover heredaron un color que no les correspondía (blanco sobre
> celeste, ≈3.1:1, por debajo de AA). El celeste sigue existiendo, ahora como `--informativo`.

## La decisión de fondo

`09-notas-identidad-visual.md` dejaba abierta una bifurcación: estilo editorial del libro, estilo
por campaña de Instagram, o sistema propio. Se elige **sistema propio con la paleta del libro como
base**, y el logo de cuatro pétalos y el swoosh como constantes gráficas. El estilo vibrante de
cada campaña vive dentro del contenido (flyers de Eventos), nunca en la interfaz.

Motivos: una interfaz necesita que "primario" y "destructivo" signifiquen siempre lo mismo, y la
identidad de Instagram cambia por campaña; el libro es el material más institucional y permanente
que tiene la iglesia; los tonos cálidos y tranquilos le sirven a quien llega por primera vez, que
es el público del problema; y es la única base que se puede llevar a contraste AA sin pelearse
consigo misma.

## Paleta

| Rol | Color del libro | Claro | Oscuro |
|---|---|---|---|
| Fondo | Crema / blanco roto | `#fbf9f4` | `#1c1612` |
| Texto | Marrón muy oscuro | `#2f1e17` | `#f3f0e9` |
| Primario | **Terracota** (vasija) | `#a14e2b` | `#d58966` |
| Secundario | Beige | `#efe7d9` | `#352c25` |
| Informativo | Celeste (ola, agua) | `#4896bc` | `#6baed1` |
| Éxito | Verde salvia | `#40704e` | `#7bac88` |
| Advertencia | Ámbar cálido | `#a97416` | `#dbab5e` |
| Destructivo | Rojo carmín | `#b81839` | `#e75e6a` |

## Tokens para `packages/ui/src/styles/theme.css`

```css
:root {
  --background: oklch(0.982 0.007 85);
  --foreground: oklch(0.255 0.030 45);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.255 0.030 45);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.255 0.030 45);
  --primary: oklch(0.520 0.120 42);
  --primary-foreground: oklch(1 0 0);
  --secondary: oklch(0.930 0.020 80);
  --secondary-foreground: oklch(0.255 0.030 45);
  --muted: oklch(0.950 0.012 82);
  --muted-foreground: oklch(0.480 0.028 55);
  /* D123: neutro de hover (= --sidebar-accent), no el celeste. */
  --accent: oklch(0.930 0.020 80);
  --accent-foreground: oklch(0.255 0.030 45);
  --informativo: oklch(0.640 0.095 232);
  --informativo-foreground: oklch(1 0 0);
  --success: oklch(0.500 0.075 152);
  --success-foreground: oklch(1 0 0);
  --warning: oklch(0.600 0.120 75);
  --warning-foreground: oklch(1 0 0);
  --destructive: oklch(0.505 0.190 18);
  --destructive-foreground: oklch(1 0 0);
  --border: oklch(0.885 0.015 80);   /* divisores decorativos */
  --input: oklch(0.640 0.018 80);    /* borde de campos: 3.2:1 */
  --ring: oklch(0.520 0.120 42);
  /* Velo de HeroConFoto (docs/claude_20-fotos-web-publica.md) — mismo
     valor en :root y en .dark a propósito, no se redefine abajo: es una
     foto real, no una superficie de UI que cambia con el tema.
     --velo-heroe-opacidad (H-123): única fuente del α — scripts/
     chequear-contraste-velo.mjs lo lee de acá, no lo repite a mano. */
  --velo-heroe: oklch(0.255 0.030 45);
  --velo-heroe-texto: oklch(1 0 0);
  --velo-heroe-opacidad: 65%;
}

.dark {
  --background: oklch(0.205 0.012 50);
  --foreground: oklch(0.955 0.010 85);
  --card: oklch(0.245 0.013 50);
  --card-foreground: oklch(0.955 0.010 85);
  --popover: oklch(0.245 0.013 50);
  --popover-foreground: oklch(0.955 0.010 85);
  --primary: oklch(0.700 0.105 45);
  --primary-foreground: oklch(0.205 0.012 50);
  --secondary: oklch(0.300 0.018 55);
  --secondary-foreground: oklch(0.955 0.010 85);
  --muted: oklch(0.275 0.013 50);
  --muted-foreground: oklch(0.740 0.020 70);
  /* D123: neutro de hover (= --sidebar-accent), no el celeste. */
  --accent: oklch(0.300 0.018 55);
  --accent-foreground: oklch(0.955 0.010 85);
  --informativo: oklch(0.720 0.085 232);
  --informativo-foreground: oklch(0.205 0.012 50);
  --success: oklch(0.700 0.075 152);
  --success-foreground: oklch(0.205 0.012 50);
  --warning: oklch(0.770 0.110 78);
  --warning-foreground: oklch(0.205 0.012 50);
  --destructive: oklch(0.660 0.170 18);
  --destructive-foreground: oklch(0.205 0.012 50);
  --border: oklch(0.330 0.013 55);
  --input: oklch(0.520 0.015 55);
  --ring: oklch(0.700 0.105 45);
}
```

### Tokens del sidebar y de los gráficos

El archivo actual también define `--sidebar-*` (los usa el menú lateral del backoffice) y
`--chart-*`. Si quedan neutros, el menú lateral sigue gris aunque el resto tome color.

```css
:root {
  --sidebar: oklch(0.955 0.012 82);
  --sidebar-foreground: oklch(0.255 0.030 45);
  --sidebar-primary: oklch(0.520 0.120 42);
  --sidebar-primary-foreground: oklch(1 0 0);
  --sidebar-accent: oklch(0.930 0.020 80);
  --sidebar-accent-foreground: oklch(0.255 0.030 45);
  --sidebar-border: oklch(0.885 0.015 80);
  --sidebar-ring: oklch(0.520 0.120 42);
  --chart-1: oklch(0.560 0.130 42);   /* terracota */
  --chart-2: oklch(0.600 0.095 232);  /* celeste */
  --chart-3: oklch(0.560 0.080 152);  /* salvia */
  --chart-4: oklch(0.680 0.120 78);   /* ámbar */
  --chart-5: oklch(0.400 0.050 55);   /* marrón */
}

.dark {
  --sidebar: oklch(0.245 0.013 50);
  --sidebar-foreground: oklch(0.955 0.010 85);
  --sidebar-primary: oklch(0.700 0.105 45);
  --sidebar-primary-foreground: oklch(0.205 0.012 50);
  --sidebar-accent: oklch(0.300 0.018 55);
  --sidebar-accent-foreground: oklch(0.955 0.010 85);
  --sidebar-border: oklch(0.330 0.013 55);
  --sidebar-ring: oklch(0.700 0.105 45);
  /* los --chart-* se mantienen: ya son legibles sobre el fondo oscuro */
}
```

Texto sobre el sidebar: 13.9:1 en claro, 14.3:1 en oscuro.

**Ojo con los bordes del modo oscuro:** hoy son `oklch(1 0 0 / 10%)` y `/ 15%`, o sea blanco
translúcido. Se reemplazan por los valores opacos de arriba — el `--input` translúcido no llegaba
a 3:1 contra el fondo.

### Hover de los botones sólidos (H-56)

El hover **no se hace bajando la opacidad**: `bg-primary/80` acerca el botón al fondo y el texto
blanco cae de 5.8:1 a 3.9:1, por debajo de AA. Se cambia de tono.

```css
:root { --primary-hover: oklch(0.460 0.118 42); }  /* 7.5:1 con blanco */
.dark { --primary-hover: oklch(0.760 0.100 45); }  /* 8.1:1 con el texto oscuro */
```

El botón destructivo sigue el mismo criterio (merge de la 004): es **sólido**
(`bg-destructive` + `text-destructive-foreground`), no un tinte translúcido. El tinte
(`bg-destructive/20` con el rojo como texto) daba 3.5:1 en oscuro sobre el pie de un
`AlertDialog` y su hover por opacidad bajaba a 3.0:1.

```css
:root { --destructive-hover: oklch(0.440 0.180 18); }  /* 8.5:1 con blanco */
.dark { --destructive-hover: oklch(0.720 0.170 18); }  /* 6.7:1 con el texto oscuro */
```

El **resumen de errores** (`ResumenErrores`) lleva el texto en `--foreground` sobre el tinte
`destructive/10`, con el borde en `--destructive`: el rojo como texto sobre su propio tinte, dentro
de un `Sheet` (fondo `--popover`) en oscuro, daba 4.2:1.

## Contrastes medidos

Mínimos de D81: 4.5:1 para texto, 3:1 para elementos de interfaz y foco.

| Par | Claro | Oscuro |
|---|---|---|
| Texto sobre fondo | 15.1 | 15.7 |
| Texto secundario sobre fondo | 6.3 | 7.8 |
| Texto sobre card | 15.9 | 14.3 |
| Texto del botón primario sobre primario | 5.8 | 6.5 |
| Texto del botón destructivo sobre destructivo | 6.5 | 5.3 |
| Texto del botón destructivo sobre su hover | 8.5 | 6.7 |
| Botón destructivo contra el pie de un `AlertDialog` | 6.1 | 4.6 |
| Texto del resumen de errores sobre su tinte, dentro de un `Sheet` | 13.4 | 12.6 |
| Texto del botón de éxito sobre éxito | 5.8 | 6.9 |
| Primario como texto (enlaces) | 5.5 | 6.5 |
| Éxito como texto | 5.5 | 6.9 |
| Destructivo como texto | 6.2 | 5.3 |
| Borde de campo sobre fondo | 3.2 | 3.2 |
| Informativo como elemento de interfaz | 3.29 | 7.37 |
| Texto del acento (hover neutro) sobre acento | 12.92 | 12.01 |
| Anillo de foco sobre fondo | 5.5 | 6.5 |

**Velo de `HeroConFoto`** (`--velo-heroe`/`--velo-heroe-texto`/`--velo-heroe-opacidad`,
packages/ui/src/components/hero-con-foto.tsx): no entra en esta tabla — el fondo no es un token fijo,
es una foto, así que el contraste depende de cuál. H-123: la medición dejó de ser una tabla escrita a
mano acá o en el componente — `pnpm run check:contraste-velo` (adentro de `pnpm check`,
scripts/chequear-contraste-velo.mjs) la corre de verdad, contra las fotos declaradas en
`apps/web/src/assets/images/fotos-heroe.ts`, leyendo `--velo-heroe`/`--velo-heroe-opacidad` de este
mismo archivo de tema — no hay números fijos que puedan quedar desactualizados. Umbral: 4.5:1 (texto
normal — el héroe siempre puede llevar un párrafo, no solo el `<h1>`). Provisorio de este lote — la
diseñadora lo revisa cuando lleguen las fotos definitivas.

## Reglas de uso

- **El celeste (`--informativo`) no se usa para texto sobre crema.** Llega a 3.29:1: alcanza para
  un elemento de interfaz o una decoración, no para leer. (Ya estaba advertido en `09`.)
- **`--accent` es el neutro de hover de los componentes de `packages/ui/src/components/ui/`
  (convención de shadcn/Base UI), no un color de marca** (D123). Si algo necesita comunicar "esto
  es informativo", usa `--informativo`, nunca `--accent`.
- **Terracota y carmín se parecen, sobre todo con daltonismo rojo-verde.** Por eso el destructivo
  se corrió a un rojo más frío (`#b81839` en vez de un rojo anaranjado) y, como ya pide la guía,
  toda acción destructiva lleva **ícono + verbo explícito**, nunca solo el color.
- **Ningún estado se comunica solo con color** (D81): siempre texto + ícono.
- **Dos bordes distintos:** `--border` es para divisores decorativos y puede ser sutil; `--input`
  es el borde de un campo o un control y tiene que llegar a 3:1. No se intercambian.
- **El fondo no es blanco puro**, es crema (`#fbf9f4`). Las cards sí son blancas: esa diferencia
  es la que da profundidad sin sombras pesadas.

## Placeholders de imagen

Mientras falten las fotos reales (equipo pastoral, templo, congregación, portadas de los libros),
el hueco **no** es un rectángulo gris. Es un bloque en `--secondary` (beige en claro, marrón en
oscuro) con el logo de cuatro pétalos centrado al 20% de opacidad, proporción 3:2 para fotos de
equipo grupales, 1:1 para retratos individuales y 4:3 para tarjetas de sección (carpetas
`retratos/` y `cards/`, `docs/claude_20-fotos-web-publica.md` — necesario para que un placeholder
conviva en la misma grilla con una foto real ya cargada, ej. Liderazgo o Ediciones VS en
`/nosotros`) y 2:3 para portadas de libros. El texto "Foto pendiente" se mantiene solo como
`aria-label`, nunca visible (H-82) — el hueco con la marca de agua ya comunica que falta la foto;
mostrar el texto además le cuenta a quien visita la web un problema interno nuestro.

Un bloque de marca se lee como diseñado; el rectángulo gris se lee como roto.

## Lo que esto NO decide

- **Tipografías.** Hoy es Geist para todo. El libro usa una serif display para títulos y una
  script para acentos. Recomendación: sumar **una sola** serif display para los títulos grandes
  (`--font-heading`, que ya existe como token apuntando a la sans) y dejar Geist para el resto.
  La script del libro no entra en una interfaz: es ilegible en tamaños chicos.
- **El swoosh.** Falta el archivo vectorial; una vez que esté, se usa como elemento decorativo de
  las cabeceras de sección.
- **Las fotos reales.** Es lo único que no depende del código: hay que pedírselas al equipo de
  comunicación de la iglesia.
