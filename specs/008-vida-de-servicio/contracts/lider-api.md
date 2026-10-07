# Contrato: Líder de curso — Mis grupos (`apps/web`, D142)

Todos con `@RequierePermiso('mis_grupos.ver')` (lectura) o `('mis_grupos.gestionar')` (escritura),
**más** la verificación por registro en el servicio: Liderazgo vigente (`hasta IS NULL`) del que pide
en ese Grupo; si no, `404 GRUPO_NO_ENCONTRADO` (no se confirma que exista, Principio V). Escrituras
sobre un Grupo `finalizado`: `409 GRUPO_NO_EN_CURSO` (FR-037).

## `GET /vida-de-servicio/mis-grupos` → `MiGrupoResumen[]`

Grupos de Vida de Servicio con Liderazgo vigente del que pide, `en_curso` primero y después los
finalizados de los últimos 12 meses. Sin paginar: un Líder tiene pocos (≤ 20 por construcción; si hay
más, se corta y se dice).

```ts
type MiGrupoResumen = { grupoId; nombre; estado: 'en_curso' | 'finalizado'; inscriptosActivos: number;
  conAlertaDeFaltas: number; proximaSemana: { numero; fechaLiberacion; conMaterial: boolean } | null;
  semanasSinMaterialVencidas: number };
```

## `GET /vida-de-servicio/mis-grupos/:grupoId` → `MiGrupoDetalle`

```ts
type MiGrupoDetalle = { grupoId; nombre; sede; fechaInicio; estado; lideres: { personaId; nombre }[];
  semanas: SemanaParaLider[];
  inscriptos: InscriptoParaLider[];        // activa primero; después cerradas, con estado
  finalizacion: { propuestaEn: string | null; rechazadaEn: string | null; motivoRechazo: string | null;
    sePuedeProponerDesde: string /* fecha de la última semana */ } };
type SemanaParaLider = { numero; fechaLiberacion;
  estado: 'sin_material' | 'cargado_por_liberar' | 'liberada' | 'vencida_sin_material' };
type InscriptoParaLider = { inscripcionId; nombre; apellido; telefono: string | null /* solo activa; Pregunta 3 */;
  estado: EstadoInscripcion; faltas: number; alertaFaltas: boolean;
  bajaPropuesta: { tipo: TipoBaja; en: string } | null;
  bajaRechazada: { en: string; motivo: string | null } | null };
```

## `GET /vida-de-servicio/mis-grupos/:grupoId/semanas/:numero` → `ContenidoParaLider`

Igual a `ContenidoParaPersona` más `cargadoPor`, `editadoPor`, `editadoEn`, `estado`. Si no hay
material: `{ numero, fechaLiberacion, estado: 'sin_material' }`.

## `PUT /vida-de-servicio/mis-grupos/:grupoId/semanas/:numero` `multipart/form-data`

Campos: `titulo`, `texto?`, `enlaces` (JSON `[{ texto, url }]`), `archivosNuevos[]` (con
`textoAlternativo[i]` para imágenes), `archivosQuitar` (JSON de ids). Crea o reemplaza el Contenido de
la semana en una transacción; los archivos se suben al storage **antes** de la transacción y, si la
transacción falla, se eliminan (compensación).

Errores de campo (`VALIDACION`): `TITULO_REQUERIDO`, `TITULO_DEMASIADO_LARGO`,
`TEXTO_DEMASIADO_LARGO`, `MATERIAL_VACIO` (sin texto, archivo ni enlace), `ARCHIVO_TIPO_NO_ADMITIDO`,
`ARCHIVO_DEMASIADO_GRANDE`, `DEMASIADOS_ARCHIVOS`, `TEXTO_ALTERNATIVO_REQUERIDO`,
`ENLACE_URL_INVALIDA`, `ENLACE_TEXTO_REQUERIDO`, `DEMASIADOS_ENLACES`. `404 SEMANA_NO_ENCONTRADA`.

Si es la primera carga y la fecha ya llegó: marca `liberacionAvisadaEn` y emite `contenido_liberado`
(research #4). Responde `200 ContenidoParaLider`.

## `GET /vida-de-servicio/mis-grupos/:grupoId/asistencia/:fecha` → `AsistenciaDelDia`

`fecha` `YYYY-MM-DD`. Lista las Inscripciones `activa` (y las que estaban `activa` en esa fecha si se
cerraron después) con `presente` (lo guardado, o `true` si todavía no hay Encuentro) y `faltas`.

## `PUT /vida-de-servicio/mis-grupos/:grupoId/asistencia/:fecha` `{ ausentes: string[] }` → `AsistenciaDelDia`

Upsert idempotente del Encuentro (sin capítulos) y de una Asistencia por Inscripción `activa` en esa
fecha (research #13). Campo `fecha`: `FECHA_FUTURA`, `FECHA_ANTERIOR_AL_INICIO`. Un id en `ausentes`
que no es Inscripción activa del Grupo: `VALIDACION` `{ campo: 'ausentes', code:
'INSCRIPCION_AJENA' }`. También lo puede llamar el Admin por la ruta de `admin-api.md`.

## `POST /vida-de-servicio/mis-grupos/:grupoId/inscripciones/:inscripcionId/baja/proponer`

`{ tipo: 'dada_de_baja' | 'abandono', comentario?: string }`. `409 INSCRIPCION_NO_ACTIVA`,
`409 BAJA_YA_PROPUESTA` (ya existe, 004), campo `comentario`: `MOTIVO_DEMASIADO_LARGO`. Emite
`baja_propuesta`.

## `POST /vida-de-servicio/mis-grupos/:grupoId/finalizacion/proponer`

`409 FINALIZACION_YA_PROPUESTA` (ya existe), `409 FINALIZACION_ANTES_DE_TIEMPO` (con `desde` en el
cuerpo del error). Emite `finalizacion_propuesta`.
