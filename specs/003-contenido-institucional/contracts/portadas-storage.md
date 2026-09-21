# Contrato: `StorageService` y la ruta pública de portadas

Primera implementación real de `StorageService` en el proyecto (D110, `docs/10-stack-tecnico.md`) —
hasta este spec solo existía documentado, no había código. Consumido en este spec únicamente por
`libro/` (portada); cualquier feature futura con archivos (comprobantes de Pago, flyers de Eventos)
implementa contra la misma interfaz sin tocar esta, agregando lo que le falte (ej. `descargar` con
URL firmada para archivos privados).

## Interfaz (`apps/api/src/storage/storage.service.ts`)

```ts
interface StorageService {
  subir(args: { buffer: Buffer; nombreOriginal: string; mimeType: string }): Promise<{ ruta: string; url: string }>;
  eliminar(ruta: string): Promise<void>;
}
```

- `subir`: recibe el buffer YA procesado (redimensionado/recomprimido/recortado por
  `imagen-portada.service.ts` — `StorageService` no sabe nada de imágenes, solo guarda bytes),
  genera un nombre de archivo propio (nunca `nombreOriginal`, salvo para derivar la extensión a
  partir de `mimeType` real, no del nombre) y devuelve tanto la `ruta` interna (lo que se guarda en
  `Libro.portadaUrl` — en este caso, la URL pública ya armada) como la `url` completa.
- `eliminar`: recibe la `ruta` devuelta por `subir` y borra el archivo. Silenciosamente no-op si el
  archivo ya no existe (evita que un doble llamado, ej. un reintento de red, rompa el flujo).

## Proveedor de dev: `LocalStorageProvider`

- Escribe en `STORAGE_DIR` (variable de entorno, default `apps/api/storage/portadas/`), **fuera del
  control de versiones** (entrada nueva en `.gitignore`).
- Nombre de archivo: `randomUUID()` + extensión derivada de `mimeType` (`image/jpeg` → `.jpg`, etc.)
  — nunca el nombre que trae quien sube (FR-023).
- La `url` devuelta es la ruta pública bajo la que `apps/api` sirve esa carpeta como estática (ver
  abajo) — no una ruta de filesystem.

## Ruta pública (D110, FR-026)

`main.ts` monta `STORAGE_DIR` como estático de Express (`app.useStaticAssets` del adapter, sin
dependencia nueva) bajo un prefijo propio, ej. `/archivos/portadas/`:

- Público, sin guard, sin sesión — es contenido destinado a verse sin login (`docs/13`).
- Deliberadamente **distinto** del endpoint de subida (`POST /libros/:id/portada`, que sí exige rol
  Admin) — "el archivo resultante se sirve público, el endpoint de subida no" es literal del spec
  (FR-026) y de D110.
- Sin cache-busting explícito en este spec: al reemplazar una portada, el nombre de archivo cambia
  (nuevo `randomUUID()`), así que no hace falta invalidar caché de un nombre reusado — la portada
  vieja simplemente deja de referenciarse desde `Libro.portadaUrl` y se elimina del storage en la
  misma operación (ver `libros-api.md`, `POST /libros/:id/portada`).

## Migración futura a S3-compatible (fuera de alcance de este spec)

La interfaz ya está diseñada para no cambiar cuando eso ocurra: un `S3StorageProvider` implementaría
`subir`/`eliminar` contra un bucket público (AWS S3, Cloudflare R2 — `docs/10`), devolviendo como
`url` la URL pública del bucket/CDN en vez de una ruta bajo el propio dominio de `apps/api`. Ningún
consumidor (`libro.service.ts`, `imagen-portada.service.ts`) necesita cambiar — es exactamente el
punto de D110 ("sin reescribir la lógica de negocio que usa esos archivos"). No se implementa en este
spec por no tener todavía una cuenta/bucket real ni una decisión de hosting (D75, pospuesta).
