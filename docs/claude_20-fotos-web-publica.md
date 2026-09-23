# Fotos de la web pública — inventario y aplicación

*Complementa `claude_17-paleta-y-tokens.md` ("Placeholders de imagen" y "Las fotos reales"). A partir de este documento, las fotos reales existen: los placeholders de `PlaceholderImagen` quedan solo para lo que sigue sin foto (equipo pastoral individual, templo por fuera).*

## Origen y calidad

- Fuente: fotos publicadas por la iglesia en Facebook e Instagram (misma sesión fotográfica: luz cálida, grano, swoosh blanco). Curadas y recortadas fuera del repo. El zip original traía un `manifest.md` con el post de origen de cada archivo, pero **no se sumó al repo** — hoy no queda registro de qué post salió cada foto (ver "Pendiente").
- **Son provisorias.** Vienen de redes (máx. 1080 px) y las de Instagram de capturas (~800 px). Se reemplazan por los originales del fotógrafo cuando lleguen, **sin cambiar nombres de archivo**: el reemplazo es copiar encima.
- Todas en WebP, un solo archivo por foto (`nombre.webp`, tamaño máximo disponible).

## Ubicación en el repo

```
apps/web/src/assets/images/
  hero/       16:9   portadas de página (Inicio, Cultos)
  cards/       4:3   tarjetas de sección y bloques de contenido
  retratos/    1:1   personas: bienvenida, pastores, liderazgo
  reserva/     —     no se usan en el MVP
```

Viven en `src/`, no en `public/`: `apps/web/tsconfig.json` mapea el alias `@/*` a `./src/*`, no a la raíz del proyecto, así que un import como `@/public/images/...` no resuelve. Y aunque resolviera, un archivo en `public/` se sirve dos veces si además se importa — servido tal cual por su URL pública y otra vez empaquetado como bundle optimizado — sin ningún sentido para algo que solo se consume vía `next/image`.

Se sirven con `next/image` **con import estático** (`import hero from '@/assets/images/hero/hero-culto-congregacion.webp'`), así Next conoce ancho/alto y no hay layout shift. `alt` obligatorio y descriptivo (D83); el texto alternativo de cada foto está en la tabla de abajo. Héroe del Inicio con `priority`; el resto lazy. `sizes` acorde al grid (tarjetas: `(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw`).

Las fotos **no se recortan de nuevo en CSS** salvo por diferencia mínima de proporción: cada carpeta ya viene en la proporción de su uso; si un componente usa otra caja (p. ej. 3:2 heredado del placeholder), se ajusta la caja del componente a la proporción de la carpeta, no al revés.

## Dónde va cada una

### Inicio
| Uso | Archivo | Alt |
|---|---|---|
| Héroe principal | `hero/hero-culto-congregacion` | Congregación de Vida Sobrenatural durante un culto, vista desde atrás |
| Héroe alternativo (A/B o modo oscuro) | `hero/hero-multitud-bn` | Congregación en blanco y negro con el swoosh de la marca |
| Tarjeta Primeros pasos | `cards/card-bienvenida-estas-en-casa` | Equipo de bienvenida frente al cartel "Estás en casa" |
| Tarjeta Nosotros | `cards/card-comunidad-pareja-mayor` | Pareja mayor entre la congregación |
| Tarjeta Eventos | `cards/card-jovenes-manos` | Jóvenes con las manos levantadas en un culto |
| Tarjeta Visitanos | `cards/card-culto-manos` | Congregación con manos levantadas frente al escenario |

### Nosotros (página de entrada, seis tarjetas — D122)
| Tarjeta | Archivo | Alt |
|---|---|---|
| Quiénes somos | `cards/card-comunidad-risas` | Personas riendo durante un culto |
| Visión, misión y valores | `hero/hero-adoracion-mujeres` (recortar a 4:3 en CSS es aceptable acá, es la única excepción) | Mujeres adorando entre la congregación |
| Liderazgo | `cards/card-pastores-pareja` | Pareja pastoral hablando al micrófono |
| En qué creemos | `cards/card-estudio-cuaderno` | Manos escribiendo en un cuaderno sobre una Biblia abierta |
| Palabra Profética | `cards/card-pastora-oracion` | Pastora orando con el micrófono por una mujer |
| Ediciones VS | sin foto: se usa la primera portada de libro cargada, o el placeholder | — |

Subpágina **Liderazgo**: solo `retratos/retrato-pastor-jp` (Juan Pablo Sosa), con alt *"Juan Pablo Sosa hablando con micrófono en el escenario, con el swoosh blanco de la marca de fondo"* — escrito mirando la foto, no deducido del nombre del archivo. El resto del equipo sigue con placeholder 1:1 hasta tener retratos.

> **`retrato-predicador-swoosh` se sacó de esta página el 2026-09-23** y pasó a `reserva/predicador-invitado.webp`. **No es un pastor de Vida Sobrenatural**: es un pastor invitado que vino a dar una charla. Estuvo brevemente en la posición que nombra a Lorena Scerra y Ezequiel Rossini, y aunque su alt no afirmaba ninguna identidad, **la posición en la grilla la afirma igual** — presentar la cara de una persona real como parte del liderazgo de la iglesia es tergiversarla. No vuelve a la UI.

> **Para la diseñadora:** las tarjetas de Liderazgo son **por pareja** (dos nombres cada una), pero las fotos disponibles son **individuales**. Hoy la primera tarjeta muestra a una persona y nombra a dos. O las fotos pasan a ser de la pareja, o las tarjetas pasan a ser por persona; hoy queda así a propósito, como mock.

### Primeros pasos
| Bloque | Archivo | Alt |
|---|---|---|
| Cabecera | `cards/card-bienvenida-equipo` | Voluntarias del equipo de bienvenida sonriendo |
| Bienvenida | `retratos/retrato-bienvenida-hola` | Voluntaria con credencial "hola! bienvenido a casa" |
| Vida Nueva (discipulado) | `cards/card-estudio-biblico` | Mujer leyendo la Biblia en el culto |
| Vida de Servicio / Ministerios | `cards/card-alabanza-escenario` | Equipo de alabanza en el escenario |
| Grupos de Extensión | `cards/card-grupos-mesa` | Mesa servida con pan, vino y flores |
| Bautismo | `cards/card-bautismo` (retrato: `retratos/retrato-bautismo`) | Recién bautizados abrazándose con remeras "Sí, yo creo" |
| Preguntas frecuentes | `cards/card-abrazo-bienvenida` | Dos mujeres abrazándose en la entrada |

### Visitanos
| Bloque | Archivo | Alt |
|---|---|---|
| Cabecera | `cards/card-culto-manos` | Congregación con manos levantadas frente al escenario |
| "Queremos conocerte" | `cards/card-abrazo-hombres` | Dos hombres saludándose con un abrazo |
| Familias / niños | `cards/card-ninos-globo`, `cards/card-familia-padre-hijas` | Padre con su hijo en hombros sosteniendo un globo · Padre abrazando a sus dos hijas |

### Sin asignar (disponibles para módulos nuevos)
`card-adoracion-mano-alzada`, `card-alabanza-cantante`, `card-alabanza-banda`, `card-comunidad-dos-mujeres`, `card-comunidad-hombres-celular`, `card-ninos`, `card-oracion-abrazo`, `retrato-adoracion-mujer`, `retrato-familia-padre-hijas`.

### Reserva (no usar en la UI)
- `reserva/placa-institucional` — banner con logo y dirección, listo para **imagen Open Graph** por defecto (`opengraph-image`), no para el layout.
- `reserva/collage-alabanza-mujeres` — collage, demasiado cargado.
- `reserva/predicador-invitado` — pastor invitado a una charla, **no** del equipo de la iglesia. Está acá para que no se use por error como retrato de liderazgo ni como imagen genérica de "alguien predicando": es una persona identificable y real, y cualquier uso en la UI insinúa una pertenencia que no existe.

## Un archivo por foto, a propósito

El material llegó con dos versiones de varias fotos (`nombre.webp` y `nombre-1x.webp`, más chica).
**Las 17 versiones `-1x` se eliminaron** al mover las fotos a `src/assets/`: `next/image` arma el
`srcset` solo a partir de un archivo, así que una versión chica hecha a mano no la sirve nadie —
y si se importara esa, se estaría capando la calidad sin ganar nada.

Queda escrito porque el día que lleguen los originales del fotógrafo pueden venir otra vez con
variantes de tamaño: **no hay que sumarlas**. Un archivo por foto, el más grande disponible.

## Reglas

1. Ninguna foto de conferencias o campañas (Mujeres de Impulso, Indestructibles) en la interfaz: son identidad de evento y van solo dentro de su Evento.
2. Texto sobre foto solo en los héroes, con el velo definido en `claude_17` para garantizar contraste (H-82).
3. Las tarjetas no llevan filtro ni tinte: las fotos ya vienen con la gradación cálida de la marca.
4. Cuando lleguen los originales, se regeneran los WebP con los mismos nombres y proporciones; ningún componente cambia.

## Pendiente
- Pedir originales, en este orden: héroe (congregación; jóvenes con manos levantadas), bautismo, retratos del equipo pastoral, fachada del templo.
- Sumar el `manifest.md` al repo (ver "Origen y calidad") — sin él no hay forma de rastrear qué post de Facebook/Instagram originó cada foto.
- Swoosh vectorial: sigue faltando (`claude_17`).
