# Research: Contenido institucional

Fuente principal: `docs/10-stack-tecnico.md` (StorageService y procesamiento de imagen ya decididos
en principio, D110), `docs/04-dominio-entidades.md` (campos de Libro/Palabra Profética ya nombrados),
y el código real de `sede/` (`apps/api`) y `sedes/` (`apps/backoffice`) como patrón a reutilizar
(FR-018). Este documento resuelve **cómo** implementar cada pieza, no si usarla.

## 1. Procesamiento de imagen: `sharp`

**Decision**: `sharp` para redimensionar, recomprimir y recortar centrado la portada al subir
(FR-023/FR-024).

**Rationale**: Es la librería de facto en el ecosistema Node.js para procesamiento de imagen server-
side (bindings nativos sobre libvips, sin proceso externo) — la usa el propio `next/image` de
Next.js internamente, así que ya está probada en producción dentro de este mismo stack aunque nunca
se importó directamente en `apps/api`. Cubre las tres operaciones que pide el spec con una sola
llamada encadenada: `sharp(buffer).resize(ancho, alto, { fit: 'cover', position: 'centre' })` recorta
centrado a 2:3 sin deformar cuando la imagen no es ya vertical (FR-024, exactamente el criterio de
`fit: 'cover'`), y `.jpeg({ quality })`/`.webp({ quality })` recomprime (FR-023) preservando el
formato de salida o normalizando a uno solo — se resuelve al implementar, no cambia el contrato.

**Alternatives considered**:
- `jimp` (JS puro, sin bindings nativos): más simple de instalar pero notablemente más lento y sin
  mantenimiento tan activo; no aporta nada que compense la desventaja de performance en un paso que
  corre en cada subida.
- Procesar en el frontend antes de subir (canvas API): dejaría el archivo servido dependiendo de lo
  que cada navegador haga bien, y no protege contra un cliente que se salte esa validación (POST
  directo a la API) — la Constitución exige la validación real del lado del servidor.

## 2. Subida de archivo: `FileInterceptor` de `@nestjs/platform-express`

**Decision**: `@UseInterceptors(FileInterceptor('portada'))` con `multer` en memoria
(`MemoryStorageEngine`, sin escribir a disco antes de procesar), límite de tamaño y filtro de MIME
tipo ya aplicados por `multer` como primera barrera, y una segunda validación explícita en el service
contra las constantes de `packages/shared-types` (defensa en profundidad — la cabecera `Content-Type`
que manda el cliente no es confiable por sí sola).

**Rationale**: `apps/api` ya usa `@nestjs/platform-express` (es el adapter HTTP del propio NestJS,
no una dependencia nueva) — `multer`/`@types/multer` vienen como dependencia transitiva de ese
paquete y solo hace falta declararlos explícitos en `package.json` para fijar versión. Es el camino
soportado oficialmente por NestJS para subida de archivos, sin librería de terceros adicional.

**Alternatives considered**: subir directo a un proveedor externo desde el frontend (presigned URL):
resuelve mejor el caso de archivos grandes o alto volumen, pero es prematuro para un solo archivo de
máx. 5 MB por vez (Principio IV) y complica la validación server-side (el resize/recompress tiene que
pasar por la API sí o sí, D110) — se reconsidera si D110 migra a S3-compatible.

## 3. `StorageService`: interfaz y proveedor local de dev

**Decision**: Una interfaz mínima:

```ts
interface StorageService {
  subir(args: { buffer: Buffer; nombreOriginal: string; mimeType: string }): Promise<{ ruta: string; url: string }>;
  eliminar(ruta: string): Promise<void>;
}
```

(`descargar` no hace falta todavía: las portadas se sirven por URL pública estática, no por un
endpoint de descarga controlado — se agrega a la interfaz el día que un archivo privado, como un
comprobante de Pago, lo necesite; no se construye antes de tener un consumidor real, Principio IV).

Proveedor de dev: `LocalStorageProvider`, que escribe en una carpeta fuera del control de versiones
(`apps/api/storage/portadas/`, variable de entorno `STORAGE_DIR` con ese valor por default) con un
nombre de archivo generado por el sistema (`randomUUID()` + extensión derivada del tipo MIME real, no
del nombre que trae quien sube — FR-023), y la sirve montando esa carpeta como estática en `main.ts`
bajo una ruta pública propia (ej. `/archivos/portadas/`), distinta del endpoint de subida
(`POST /libros/:id/portada`, que exige rol Admin) — así el archivo resultante es público sin que el
punto de entrada de subida lo sea (D110, FR-026).

**Rationale**: Cumple D110 al pie de la letra ("interfaz `subir/descargar/eliminar`... proveedor local
en dev, migrable a S3-compatible después sin tocar la lógica de negocio") con el mínimo necesario.
Nest sirve estáticos nativamente (`app.useStaticAssets` del adapter Express) sin dependencia nueva.

**Alternatives considered**: guardar el archivo en la base como `bytea`: descarta la posibilidad de
servirlo directo por HTTP estático (cada request pasaría por Node + Prisma) y no es el camino que
D110 ya fijó; se rechaza sin más análisis por contradecir una decisión ya tomada.

**No durable hasta que exista hosting (D75)**: `LocalStorageProvider` cumple la interfaz, pero el
disco donde escribe es efímero en la mayoría de las plataformas candidatas — un despliegue nuevo lo
borra. Este spec implementa y prueba la subida (funciona en dev), pero no carga ninguna portada real
del catálogo con ella (ver `plan.md` § Storage): eso espera a que D75 se resuelva con un proveedor
que sí persista.

## 4. Validación y extracción de id de YouTube

**Decision**: Una función pura (sin librería nueva) que reconoce las formas habituales de URL de
YouTube — `youtube.com/watch?v=ID`, `youtu.be/ID`, `youtube.com/embed/ID` — vía una expresión regular
acotada a esos tres patrones, devuelve el `ID` (11 caracteres, alfanumérico + `-`/`_`) si matchea, o
`null` si no. El service la usa para: (a) rechazar al guardar si devuelve `null` (FR-011, error
`YOUTUBE_URL_INVALIDA`); (b) construir la URL de embed final desde el `ID`, nunca reusando la URL tal
como la pegó el Admin — así la subpágina pública siempre embebe desde `youtube-nocookie.com`
(FR-005) sin importar qué forma de URL cargó el Admin.

**Rationale**: No existe ya una decisión de usar la YouTube Data API para este caso (`docs/10` la
menciona para otro propósito — obtener metadata, MVP con API key, fuera de alcance de este spec: acá
solo hace falta extraer un id de una URL, no consultar si el video existe). Una regex acotada a los
tres formatos reales es más simple y no depende de una llamada de red al guardar (Principio IV);
detectar un video borrado o privado queda expresamente fuera de esta spec (Edge Cases del spec).

**Alternatives considered**: validar contra la YouTube Data API al guardar (confirma que el video
existe y es público): agrega una dependencia de red y una API key a un flujo que hoy no la necesita,
para resolver un caso (video borrado/privado) que el propio spec deja fuera de alcance explícitamente.

## 5. Constantes compartidas de portada (Principio XI)

**Decision**: `packages/shared-types/src/portada.ts` nuevo, exportando:

```ts
export const MIME_TIPOS_PORTADA_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const PORTADA_TAMANO_MAXIMO_BYTES = 5 * 1024 * 1024; // 5 MB (D110)
export const PORTADA_ASPECTO = { ancho: 2, alto: 3 } as const; // FR-024
```

Consumido por `apps/api` (validación real, filtro de `multer` y segunda verificación en el service) y
por `apps/backoffice` (validación de UI antes de subir — mismo mensaje de antemano, sin esperar el
round-trip al servidor para un archivo obviamente inválido).

**Rationale**: Exactamente el criterio de `error-code.ts` en el spec 002: un solo archivo de
constantes, importado por ambos lados, para que "5 MB" y la lista de tipos permitidos no diverjan
nunca entre la API y el backoffice (Principio XI, instrucción explícita del propio pedido del spec).

## 6. Reutilización del patrón de Sedes para Libro (FR-018)

**Decision**: `libro/` (API) y `libros/` (backoffice) replican estructura archivo por archivo a
`sede/`/`sedes/` (controller/service/dto; page/loading/error/cliente + `papelera/` + `[id]/`), en vez
de generalizar un CRUD genérico de catálogo.

**Rationale**: Ya hay dos entidades con el mismo patrón D119 (Sede, y ahora Libro) pero un tercer caso
recién llegaría con una spec futura (Curso/Ministerio/Célula, mencionados en el propio comentario del
schema como "cuando existan") — generalizar ahora sería una abstracción prematura sobre dos casos
(Principio IV: "tres líneas similares es mejor que una abstracción prematura"). Lo que sí se comparte
ya, y sigue compartiéndose sin cambios, es el componente de UI (`TablaDatos` de `packages/ui`) y el
criterio D119 en sí — no el código del módulo entero.

**Alternatives considered**: extraer un `CatalogoModule` genérico parametrizado por entidad: implica
diseñar una abstracción (relaciones, mensajes de error, columnas de tabla) para dos casos conocidos;
se pospone hasta que un tercer caso real confirme qué parte de "Sede" y "Libro" es realmente genérica.

## 7. Origen único de los archivos de marca — sin copias sincronizadas (Principio XI)

**Revisado** (segunda pasada, antes de `/speckit.tasks`): la primera versión de esta decisión asumía
que sólo se podía consumir un archivo estático de `packages/ui` copiándolo al `public/` de cada app,
y armaba un script de sincronización más un test de hash para vigilar esa copia. Revisando consumidor
por consumidor, esa copia no hace falta en ninguno de los tres casos de esta historia — se documenta
acá por qué, en vez de construir una maquinaria para un problema que no existe.

**Decision** (revisada de nuevo: movimiento, no copia — pedido explícito del usuario antes de
`/speckit.tasks`, ya ejecutado sobre el repo): los seis PNG que habían llegado a `docs/marca/` se
**movieron** a `packages/ui/src/assets/marca/` (`git mv`, conservando historial) — no se duplicaron.
`docs/marca/` ya no tiene archivos de imagen y conserva únicamente su `README.md` (documentación de
la marca: qué es el isotipo, qué es el logotipo, sobre qué fondo va cada versión, qué falta todavía)
— el README queda pendiente de que el usuario lo actualice para apuntar a la ruta nueva, no se lo
reescribe acá. `packages/ui/src/assets/marca/` es ahora el único lugar del repo donde existen estos
bytes; nunca hay dos copias en el árbol para que puedan divergir. Ningún consumidor de esta historia
necesita además una copia en `public/`:

1. **Barra de navegación y pie (`apps/web`), cabecera del sidebar (`apps/backoffice`)**: los
   componentes importan el PNG directo desde `packages/ui`. `package.json` de `packages/ui` ya
   restringe qué subrutas son importables desde afuera (`exports`: sólo `.` y `./theme.css` hoy) — un
   import crudo tipo `@vida-sobrenatural/ui/assets/marca/logo-oscuro-1024.png` no resolvería sin
   declarar esa subruta. Se suma una entrada de patrón al mismo `exports`
   (`"./assets/marca/*": "./src/assets/marca/*"`, mismo criterio ya usado para `./theme.css`) para
   que `import isotipoClaro from '@vida-sobrenatural/ui/assets/marca/logo-oscuro-1024.png'` resuelva.
   Next.js ya trata `@vida-sobrenatural/ui` como código propio vía `transpilePackages` (Decisión 1 de
   `research.md` de `002-base-transversal`) — esa opción hace que el bundler aplique sus loaders
   normales (incluido el de imports de imagen) al código *fuente* del paquete, no sólo a su JS/TS; un
   `import` de `.png` dentro de un archivo transpileado se resuelve y emite igual que si viviera en la
   propia app, sin pasar por `public/`. La versión clara/oscura se resuelve con dos `<Image>` (una por
   tema) alternadas por CSS (`dark:hidden` / `hidden dark:block`, mismo criterio que cualquier otro
   par de assets por tema en la app) en vez de una condición en JS — evita el parpadeo del logo
   equivocado antes de que hidrate el selector de tema.
2. **Favicon, ícono de iOS e íconos del manifest de PWA**: `apps/web/src/app/icon.png` +
   `apps/web/src/app/apple-icon.png` + `apps/backoffice/src/app/icon.png` (convención de archivo de
   Next.js — ver Decisión 8) y los íconos que declara `manifest.ts` **no son una copia del original**:
   son un redimensionado/recorte distinto por cada uso (512×512, 180×180, 192×192/512×512), generados
   una sola vez por un script chico con `sharp` (`scripts/generar-iconos-marca.mjs`, corrido a mano
   cuando cambia el isotipo fuente — no en cada `dev`/`build`, porque el origen "no se vuelve a
   pedir", `docs/marca/README.md`) y commiteados como cualquier otro asset generado. Al ser un
   archivo distinto en bytes del origen por diseño, no hay nada que un test de hash pueda verificar
   contra el origen; si algún día se quiere detectar que quedó desactualizado respecto al isotipo,
   eso es una comparación de fecha de generación, no de contenido idéntico — no se agrega esa
   verificación ahora por no tener today ningún caso que la dispare (Principio IV).
3. **Imagen de Open Graph**: `opengraph-image.tsx` corre en el propio proceso de `apps/web`
   (Node.js, generado por `next/og` en build/request) — puede leer el PNG origen directo del
   filesystem del monorepo (`fs.readFileSync` contra la ruta real dentro de `packages/ui`, resuelta
   con `require.resolve`/`fileURLToPath` sobre el import del paquete) sin pasar por `public/` ni por
   el bundler de assets del cliente — es una lectura de archivo en un proceso Node normal, no un
   import de imagen para el navegador. Ver Decisión 9.

**Resultado**: cero copias sincronizadas, cero script de sync, cero test de hash — el Principio XI se
cumple no teniendo el problema (un solo archivo que el código de las dos apps importa) en vez de
vigilarlo. Los dos `icon.png` de `apps/web`/`apps/backoffice` sí son dos archivos con el mismo
contenido en dos apps, pero son salida generada de un script determinístico sobre el mismo origen
(como cualquier build artifact) — no dos implementaciones de una misma regla que puedan divergir en
comportamiento, que es lo que el principio protege.

**Rationale**: Antes de construir el mecanismo de copia+sync+test, corresponde confirmar que la copia
es necesaria — no lo era. `transpilePackages` ya resuelve el caso 1 sin nada nuevo; los favicons son
derivados, no copias, así que la comparación bit a bit del Principio XI no aplica; la imagen de Open
Graph corre en un proceso Node con acceso directo al filesystem del monorepo. Construir el script de
sync igual habría sido una pieza más para mantener resolviendo un problema que no existía.

**Alternatives considered**: la versión anterior de esta decisión (copiar a cada `public/marca/` con
un script en `predev`/`prebuild` y un test de hash) — descartada tras esta revisión, ver arriba.

## 8. Favicon e ícono de PWA: convención de archivo de Next.js, sin `.ico` a mano

**Decision**: `apps/web/src/app/icon.png` y `apps/backoffice/src/app/icon.png` (derivados del
isotipo, redimensionado a ~512×512, no una copia — Decisión 7) reemplazan los `favicon.ico` por
defecto de Next.js — la convención de archivo de App Router genera automáticamente el
`<link rel="icon">` correcto, sin necesitar producir un `.ico` multi-resolución a mano (`sharp` no
escribe ese formato). Se suma `apple-icon.png` (180×180) en `apps/web` para el ícono de iOS al
agregar a inicio. El ícono de instalación de la PWA (`apps/web/src/app/manifest.ts`, nuevo — ver
Project Structure de `plan.md`) declara sus entradas `icons` (192×192 y 512×512), generadas por el
mismo script que los favicons y guardadas en `apps/web/public/icons/` (un manifest de aplicación web
necesita una URL pública real para cada ícono — a diferencia del favicon/apple-icon, que Next resuelve
por convención de archivo sin pasar por `public/`); no incluye service worker ni offline (D47,
todavía sin spec propia) — este spec sólo cubre el ícono, no el resto de la PWA.

**Rationale**: Es el camino soportado nativamente por Next.js 16 (sin dependencia nueva) y evita
mantener un `.ico` a mano cuando todos los navegadores actuales aceptan un favicon PNG. Los íconos
del manifest son la única pieza de esta historia que sí vive en `public/` — no por ser una copia de
otro archivo del repo, sino porque un manifest de PWA los referencia por URL pública, igual que
cualquier asset propio de `apps/web` que nunca existió en otro lado.

**Alternatives considered**: generar un `.ico` real con una librería adicional (`to-ico` o similar):
dependencia nueva para un formato que ya no hace falta con la convención de archivo de Next.js.

## 9. Imagen de Open Graph: incorporar el logotipo al `ImageResponse` ya existente

**Decision**: `apps/web/src/app/(publica)/opengraph-image.tsx` (ya existe, generado con `next/og`)
pasa de mostrar texto plano a incluir el logotipo — se lee el PNG origen desde el filesystem del
monorepo con `fs.readFileSync` (proceso Node, sin pasar por `public/` ni por el bundler de cliente —
Decisión 7, caso 3), se lo convierte a `data:` URI, y se lo posiciona dentro del mismo layout de
1200×630 vía `<img>` dentro del JSX que ya arma `ImageResponse`. Sin tocar `size`/`contentType`, ya
correctos.

**Rationale**: Cambio acotado sobre el archivo que ya existe — no hace falta un PNG estático de
1200×630 aparte, ninguna copia a `public/`, ni una librería nueva; `next/og` ya soporta `<img>` con
`data:` URI dentro del JSX que renderiza, y el archivo que genera esa imagen corre como código de
servidor con acceso normal al filesystem del monorepo.

## 10. Índices y `select` explícito (H-42, Principio XI)

**Decision**: Índice en `Libro.orden` (se ordena el listado público por ese campo, FR-007) y en
`PalabraProfetica.vigente` (la subpágina pública busca la única vigente con un filtro por ese campo,
FR-004) — ambos listados nuevos paginan igual que Sede y usan `select` explícito, sin `include`
implícito de relaciones que no hacen falta en cada vista.

**Rationale**: Regla ya fijada en la Constitución (Restricciones Técnicas, origen H-42) — se aplica
sin variantes a las dos entidades nuevas.
