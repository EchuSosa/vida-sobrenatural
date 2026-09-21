# Marca

Qué es cada pieza de la identidad y cuándo se usa. **Los archivos viven en
`packages/ui/src/assets/marca/`**, que es de donde los importa el código; acá queda solo la
explicación.

Hay **dos piezas distintas** y no son intercambiables:

## Isotipo (el símbolo solo)

Las cuatro formas tipo pétalo en aspa alrededor de un centro vacío — el elemento más constante de
toda la identidad (ver `09-notas-identidad-visual.md`). Cuadrado, 1024×1024.

| Archivo | Sobre qué fondo |
|---|---|
| `logo-oscuro-1024.png` | Claro |
| `logo-blanco-1024.png` | Oscuro |

**Dónde va:** favicon, ícono de la PWA, marca de agua del `PlaceholderImagen`, y cualquier lugar
donde el espacio sea cuadrado o muy chico para que el nombre se lea.

## Logotipo (símbolo + nombre)

El isotipo seguido de **VidaSobrenatural** — "Vida" en peso liviano y "Sobrenatural" en negrita,
todo junto, sin espacio. Horizontal, proporción **7.5:1** (2048×273 y 600×80).

| Archivo | Sobre qué fondo |
|---|---|
| `logotipo-oscuro-2048.png` · `logotipo-oscuro-600.png` | Claro |
| `logotipo-blanco-2048.png` · `logotipo-blanco-600.png` | Oscuro |

**Dónde va:** la barra de navegación de las dos apps, el pie de página, la imagen de Open Graph, y
más adelante el encabezado de los emails.

Ojo con la proporción: 7.5:1 es muy apaisado. En celular conviene el isotipo solo, o el logotipo
con un alto chico (24–32 px) y su ancho libre.

## Reglas

- Los seis archivos tienen **fondo transparente**: se apoyan sobre cualquier color sin recortes.
- La versión clara y la oscura se eligen **por tema** (D95, D106), no por preferencia.
- Estos son la fuente. Los tamaños chicos (favicon, íconos de la PWA) se **derivan** de acá —
  recortados y redimensionados—, que no es lo mismo que copiarlos: no hay ninguna copia
  sincronizada de estos archivos en el repositorio, y no debería haberla.
- Como el nombre es parte de la imagen, todo uso del logotipo necesita su texto alternativo
  ("Vida Sobrenatural") o, si va junto a un título que ya lo dice, quedar marcado como decorativo.

## Todavía falta

El **vectorial** (SVG) de las dos piezas, y el **swoosh** — la curva decorativa que junto con el
logo es la otra constante de la marca. Están en la tabla de pendientes de
`12-contenido-bienvenida.md`.
