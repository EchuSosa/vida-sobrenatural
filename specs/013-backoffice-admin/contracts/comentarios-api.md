# Contrato: "Contanos qué te parece"

## `POST /comentarios`

Público (sin guard de sesión); si llega token válido, se asocia la Persona. Header `X-Origen-Cliente` (lo pone el
servidor de Next, 007). Body:

```ts
interface ComentarioNuevo {
  tipo: 'problema' | 'sugerencia';
  texto: string;                 // 1..2000 tras trim
  aceptaContacto: boolean;
  contactoEmail?: string;        // solo sin sesión
  contactoTelefono?: string;     // solo sin sesión, TELEFONO_REGEX
  paginaOrigen: string;          // path, sin query
  navegador?: string;            // ≤ 80
  ultimoRequestId?: string;      // ≤ 64
  app: 'web' | 'backoffice';
}
```

Respuestas: `201 { id }`. Errores: `400 VALIDACION` con `errors: [{campo, code}]` — `texto` (`REQUERIDO`,
`DEMASIADO_LARGO`), `contacto` (`CONTACTO_REQUERIDO` si `aceptaContacto` sin sesión y sin email ni teléfono),
`contactoEmail`/`contactoTelefono` (formato); `429 DEMASIADOS_PEDIDOS` con `reintentarEn` (segundos).

Efecto posterior a la transacción: email a `EMAIL_COMENTARIOS_DESTINO` con asunto "Nuevo comentario en la app
(problema|sugerencia)" — sin texto ni datos de contacto en el asunto; el cuerpo lleva el texto y un enlace al detalle
del backoffice.

## `GET /comentarios`

Permiso: `comentarios.ver` (Admin, Pastor). Query: `revisado=no|si|todos` (default `no`), `tipo`, `skip`, `take`
(≤ 100, default 20). Orden `createdAt desc`. Respuesta `Pagina<ComentarioResumen>`:

```ts
interface ComentarioResumen {
  id: string; tipo: TipoComentario; extracto: string; // primeros 140 caracteres
  createdAt: string; paginaOrigen: string; app: 'web' | 'backoffice';
  persona: (PersonaBreve & { activo: boolean }) | null;
  aceptaContacto: boolean;
  revisado: { en: string; por: PersonaBreve } | null;
}
```

## `GET /comentarios/conteo-sin-revisar`

Permiso: `comentarios.ver`. `200 { total: number }`.

## `GET /comentarios/:id`

Permiso: `comentarios.ver`. `ComentarioDetalle = ComentarioResumen & { texto; navegador; ultimoRequestId;
contacto: { email: string | null; telefono: string | null } | null }` — `contacto` sale del comentario (sin sesión)
o del perfil de la Persona (con sesión), solo si `aceptaContacto`. `404 NO_ENCONTRADO`.

## `POST /comentarios/:id/revisado` y `DELETE /comentarios/:id/revisado`

Permiso: `comentarios.gestionar` (Admin). Idempotentes. `200 ComentarioResumen`.
