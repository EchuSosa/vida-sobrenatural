# Data Model: 006 — Mi camino por etapas, historial previo y alta de adultos

Cambios a `apps/api/prisma/schema.prisma` y a `packages/shared-types`. Una sola migración
(`<fecha>_camino_historial_email_opcional`), con SQL a mano para lo que Prisma no expresa (patrón
H-140).

## Enums nuevos

```prisma
enum EtapaCamino {
  vida_nueva
  vida_de_servicio
  ministerio
  bautismo
}

enum EstadoDeclaracion {
  pendiente
  confirmada
  rechazada
  retirada
}

enum OrigenCompletitud {
  declaracion   // la confirmó el Admin a partir de un "Ya lo hice"
  admin         // la registró el Admin directamente (Flujo 9)
}
```

`EtapaCamino` es independiente de `CategoriaCurso` (que hoy solo tiene `vida_nueva`): Bautismo y
Ministerio no son Cursos (Decisión nueva 1). La correspondencia etapa → categoría para las etapas
que son cursos vive en `CaminoService` (`vida_nueva` → `CategoriaCurso.vida_nueva`; la de
`vida_de_servicio` la agrega su spec cuando exista la categoría).

## DeclaracionHistorial (nueva)

Forma común de las Solicitudes (`docs/04`): `personaId`, `estado`, fecha, `creadoPorId`,
`revisadoPorId`.

```prisma
model DeclaracionHistorial {
  id            String            @id @default(uuid())
  personaId     String
  etapa         EtapaCamino
  estado        EstadoDeclaracion @default(pendiente)
  // Opcional, hasta 500 (FR-009). Lo escribe la Persona; lo lee el Admin.
  comentario    String?
  // null = la propia Persona. Hoy siempre null (no hay "declarar en nombre de"):
  // se modela por la forma común y para que la bandeja lo muestre igual.
  creadoPorId   String?
  revisadoPorId String?
  revisadaEn    DateTime?
  // Solo en `rechazada`, opcional, hasta 500 (FR-013). Lo ve la Persona.
  motivoRechazo String?
  retiradaEn    DateTime?
  createdAt     DateTime          @default(now())
  updatedAt     DateTime          @updatedAt

  completitud   CompletitudManual?

  @@index([personaId, etapa])
  @@index([estado, createdAt])   // la bandeja
  @@map("declaraciones_historial")
}
```

SQL de la migración:

```sql
-- FR-010: una sola pendiente por Persona y etapa.
CREATE UNIQUE INDEX "declaraciones_historial_una_pendiente"
  ON "declaraciones_historial" ("personaId", "etapa") WHERE "estado" = 'pendiente';
-- Coherencia de estados.
ALTER TABLE "declaraciones_historial" ADD CONSTRAINT "declaracion_revision_coherente"
  CHECK (("estado" IN ('confirmada','rechazada')) = ("revisadoPorId" IS NOT NULL AND "revisadaEn" IS NOT NULL));
ALTER TABLE "declaraciones_historial" ADD CONSTRAINT "declaracion_motivo_solo_rechazada"
  CHECK ("motivoRechazo" IS NULL OR "estado" = 'rechazada');
ALTER TABLE "declaraciones_historial" ADD CONSTRAINT "declaracion_retirada_coherente"
  CHECK (("estado" = 'retirada') = ("retiradaEn" IS NOT NULL));
ALTER TABLE "declaraciones_historial" ADD CONSTRAINT "declaracion_textos_largo"
  CHECK (char_length(coalesce("comentario",'')) <= 500 AND char_length(coalesce("motivoRechazo",'')) <= 500);
```

**Transiciones** (todas con la fila de la Persona bloqueada, research #5):

| De | A | Quién | Condición |
|---|---|---|---|
| — | `pendiente` | la Persona (sesión) | `puedeDeclarar(etapa, hechos)` (ver abajo) |
| `pendiente` | `retirada` | la Persona dueña | — |
| `pendiente` | `confirmada` | Admin (`historial.resolver`) | la etapa no quedó completada por el sistema ni con Completitud vigente → crea la Completitud |
| `pendiente` | `rechazada` | Admin (`historial.resolver`) | — |
| `pendiente` | `confirmada` | Admin (`completitud_manual.gestionar`) | efecto de registrar la Completitud directa de esa etapa |

Toda otra transición → `409 DECLARACION_NO_PENDIENTE`.

## CompletitudManual (nueva — definida en `docs/04`, nunca modelada)

```prisma
model CompletitudManual {
  id             String            @id @default(uuid())
  personaId      String
  etapa          EtapaCamino
  origen         OrigenCompletitud
  // Solo si origen = declaracion (CHECK).
  declaracionId  String?           @unique
  declaracion    DeclaracionHistorial? @relation(fields: [declaracionId], references: [id])
  // Opcional, hasta 500: lo que anota el Admin al registrar directo.
  nota           String?
  registradaPorId String
  registradaEn   DateTime          @default(now())
  // Borrado lógico (Principio III, FR-015).
  anuladaEn      DateTime?
  anuladaPorId   String?

  @@index([personaId, etapa])
  @@map("completitudes_manuales")
}
```

SQL de la migración:

```sql
-- FR-015: una sola vigente por Persona y etapa.
CREATE UNIQUE INDEX "completitudes_manuales_una_vigente"
  ON "completitudes_manuales" ("personaId", "etapa") WHERE "anuladaEn" IS NULL;
ALTER TABLE "completitudes_manuales" ADD CONSTRAINT "completitud_origen_coherente"
  CHECK (("origen" = 'declaracion') = ("declaracionId" IS NOT NULL));
ALTER TABLE "completitudes_manuales" ADD CONSTRAINT "completitud_anulacion_coherente"
  CHECK (("anuladaEn" IS NULL) = ("anuladaPorId" IS NULL));
ALTER TABLE "completitudes_manuales" ADD CONSTRAINT "completitud_nota_largo"
  CHECK (char_length(coalesce("nota",'')) <= 500);
```

`personaId`, `registradaPorId`, `anuladaPorId`, `creadoPorId` y `revisadoPorId` son referencias
lógicas a `Persona` sin `@relation`, como `altaPor` y los campos `*PorId` de la 004.

## Persona (cambia)

```prisma
model Persona {
  // FR-030 (D145): opcional. Sigue único entre quienes lo tienen (Postgres
  // admite varios NULL en un índice único). Se guarda normalizado (trim + minúsculas).
  email    String? @unique
  …
  @@index([telefono])         // aviso de duplicado (research #7)
  @@index([fechaNacimiento])  // aviso de duplicado (research #7)
}
```

Campos existentes que el alta usa (sin cambios de esquema): `origenAlta = admin`, `altaPor =
<id del Admin>`, `consentimientoDatos = true`, `consentimientoDatosFecha = now()`,
`consentimientoDatosOrigen = presencial`, `estado = activa`, `rol` con `miembro_registrado`
escrito por `RolesDeEstadoService.otorgarRolDeEstado` (FR-019 del 005).

Migración: `ALTER TABLE "personas" ALTER COLUMN "email" DROP NOT NULL;` — sin migración de datos
(todas las filas existentes tienen email).

## Tipos compartidos (`packages/shared-types/src/camino.ts`)

```ts
export type EtapaCamino = 'vida_nueva' | 'vida_de_servicio' | 'ministerio' | 'bautismo';

/** FR-001: orden de las cards. */
export const ETAPAS_CAMINO: readonly EtapaCamino[] = ['vida_nueva', 'vida_de_servicio', 'ministerio', 'bautismo'];

/** research #2 — cada spec de etapa se agrega acá al construir su pedido. */
export const ETAPAS_CONSTRUIDAS: readonly EtapaCamino[] = ['vida_nueva'];

/** Qué etapas tiene completas una Persona, y por qué camino (FR-016). */
export type ComoSeCompleto = 'sistema' | 'historial';
export type Completas = Partial<Record<EtapaCamino, ComoSeCompleto>>;

/** Lo que una etapa necesita para habilitarse (FR-003), para decirlo en pantalla. */
export type Requisito =
  | { tipo: 'ninguno' }
  | { tipo: 'etapa_completa'; etapa: EtapaCamino }                // VS ← VN; Ministerio ← VS
  | { tipo: 'etapa_en_curso_o_completa'; etapa: EtapaCamino };    // Bautismo ← VN (D147)

export function requisitoDeEtapa(etapa: EtapaCamino): Requisito;
/** Pura: ¿cumple el requisito? `enCurso` = etapas en curso en el sistema (hoy solo VN). */
export function reglaDeEtapa(etapa: EtapaCamino, completas: Completas, enCurso: readonly EtapaCamino[]): boolean;

export type EstadoDeclaracionVisible =
  | { estado: 'en_revision'; declaracionId: string; desde: string }
  | { estado: 'no_confirmada'; motivo: string | null; en: string };

/** FR-002: lo que ve la card. */
export type EstadoEtapa =
  | { etapa: EtapaCamino; estado: 'proximamente'; puedeDeclarar: boolean; declaracion?: EstadoDeclaracionVisible }
  | { etapa: EtapaCamino; estado: 'bloqueada'; requisito: Requisito; puedeDeclarar: boolean; declaracion?: EstadoDeclaracionVisible }
  | { etapa: EtapaCamino; estado: 'disponible'; puedeDeclarar: boolean; declaracion?: EstadoDeclaracionVisible }
  | { etapa: EtapaCamino; estado: 'en_curso' }
  | { etapa: EtapaCamino; estado: 'completada'; como: ComoSeCompleto }
  | { etapa: EtapaCamino; estado: 'en_revision'; declaracionId: string; desde: string };
// `declaracion.no_confirmada` acompaña a proximamente/bloqueada/disponible: la card muestra el
// estado de fondo y, arriba, el mensaje amable del rechazo más reciente (si es posterior a la
// última vez que cambió algo). `en_revision` reemplaza al estado de fondo (FR-008: mientras está
// pendiente, no se ofrece el pedido).

/** Vida Nueva lleva, además, su estado de la 004 para el enlace de la card (FR-005). */
export interface CaminoDeLaPersona {
  etapas: EstadoEtapa[];                 // siempre las cuatro, en ETAPAS_CAMINO
  vidaNueva: EstadoMiDiscipulado;        // el de GET /discipulado/me
}

/** Hechos que la API junta por Persona para calcular todo lo de arriba sin Prisma. */
export interface HechosCamino {
  edad: number;
  vidaNueva: EstadoMiDiscipulado;
  completas: Completas;
  declaracionesRecientes: Partial<Record<EtapaCamino, { id: string; estado: 'pendiente' | 'rechazada'; fecha: string; motivo: string | null }>>;
}

export function estadoDeEtapa(etapa: EtapaCamino, hechos: HechosCamino): EstadoEtapa;
/** FR-008 — también la usa la API para rechazar. */
export function puedeDeclarar(etapa: EtapaCamino, hechos: HechosCamino): boolean;
```

Reglas de `estadoDeEtapa` (en este orden; cada rama con su test unitario):

1. Completa (por sistema o historial) → `completada` con `como`.
2. Declaración `pendiente` → `en_revision`.
3. Vida Nueva en marcha en el sistema (`buscando` o `en_curso` de la 004) → `en_curso` (la card
   toma el texto concreto de `vidaNueva`). **Ojo:** para la regla de Bautismo (D147, "Vida Nueva
   en curso"), `enCurso` incluye `vida_nueva` solo cuando el estado de la 004 es `en_curso` (hay
   Inscripción activa), **no** `buscando`: un pedido sin Discipulador todavía no es un discipulado
   en curso.
4. Etapa fuera de `ETAPAS_CONSTRUIDAS` → `proximamente`.
5. `reglaDeEtapa` falsa → `bloqueada` con el requisito.
6. Si no → `disponible`.
   En 4–6, `puedeDeclarar` = `puedeDeclarar(etapa, hechos)` y `declaracion` = la rechazada más
   reciente si la hay.

`puedeDeclarar`: edad ≥ `EDAD_MINIMA_PEDIR_VIDA_NUEVA_SOLO` (12, FR-044 de la 004), etapa no
completa, sin declaración pendiente, y para Vida Nueva `vidaNueva.estado ∈ {puede_pedir, baja}`.

**Para Vida Nueva, `lo_pide_su_tutor` (menor de 12) es `disponible` con `puedeDeclarar = false`**,
y la card muestra el texto de la 004 (FR-044) en vez del botón.

## Tipos compartidos (`persona.ts`, `registro.ts`)

```ts
export interface DatosPersonales {          // los del Flujo 2, paso 4
  apellido: string; nombre: string; genero: Genero; fechaNacimiento: string;
  telefono: string; direccion: string; sedeId: string; estadoCivil: EstadoCivil;
  profesion: Profesion; profesionDetalle?: string; tiempoCongregacion: TiempoCongregacion;
}
export interface DatosAltaPersona extends DatosPersonales {
  email?: string | null;
  consentimiento: true;
  confirmarPosibleDuplicado?: boolean;
}
export interface CoincidenciaDuplicado {
  id: string; nombre: string; apellido: string; fechaNacimiento: string;
  telefono: string; activa: boolean;
  porque: Array<'telefono' | 'nombre_apellido_fecha'>;
}
export function erroresDeDatosPersonales(d: Partial<DatosPersonales>): { campo: keyof DatosPersonales; code: string }[];
export function normalizarTelefono(t: string): string;
export function normalizarNombre(n: string): string;
export function sonPosiblesDuplicados(a: DatosPersonales, b: DatosPersonales): CoincidenciaDuplicado['porque'];
```

## Permisos (`permisos.ts`)

```ts
| 'personas.alta'                  // ['admin'] — D143, D145
| 'personas.editar_email'          // ['admin'] — FR-037
| 'historial.resolver'             // ['admin'] — FR-013
| 'completitud_manual.gestionar'   // ['admin'] — FR-014, FR-015
```

Sin cambios de roles en los existentes (FR-028). `tienePermisoSesion(session, permiso)` pasa de
`apps/backoffice/src/auth.ts` a `shared-types` como `tienePermisoRoles(roles, permiso)` (ya existe
como `tienePermiso`): las dos apps la llaman con `session.user.rol`.

## Códigos de error nuevos (`error-code.ts`)

| Código | HTTP | Cuándo |
|---|---|---|
| `DECLARACION_YA_PENDIENTE` | 409 | FR-010: ya hay una pendiente de esa etapa |
| `ETAPA_YA_COMPLETADA` | 409 | FR-010/FR-014: completa por sistema o con Completitud vigente; o confirmar cuando el sistema ya la completó |
| `ETAPA_EN_CURSO` | 409 | FR-010/FR-014: Vida Nueva con pedido abierto o Inscripción activa |
| `DECLARACION_NO_PENDIENTE` | 409 | retirar/confirmar/rechazar algo que ya no está pendiente |
| `COMPLETITUD_NO_VIGENTE` | 409 | anular una ya anulada |
| `HISTORIAL_VIDA_NUEVA_EN_REVISION` | 409 | FR-017: pedir VN con declaración pendiente |
| `VIDA_NUEVA_COMPLETADA_POR_HISTORIAL` | 409 | FR-017: pedir VN con Completitud vigente |
| `POSIBLE_DUPLICADO` | 409 | FR-035, con `coincidencias` |
| `ALTA_MENOR_DE_EDAD` | 400 | FR-033: código **de campo** (`fechaNacimiento`) dentro de `VALIDACION`, como `FRANJAS_REQUERIDAS` en la 004 |
| `EMAIL_YA_CARGADO` | 409 | FR-037: "Agregar email" a una Persona que ya tiene |

Códigos de campo nuevos (dentro de `VALIDACION`): `COMENTARIO_DEMASIADO_LARGO`, `MOTIVO_DEMASIADO_LARGO`, `NOTA_DEMASIADO_LARGA`.

Reutilizados: `EMAIL_DUPLICADO` (FR-034, en el campo `email`), `VALIDACION` (errores de campo),
`NO_ENCONTRADO`, `SIN_PERMISO`, `EDAD_INSUFICIENTE_PARA_PEDIR_SOLO` (declarar con menos de 12).

## Seed demo (FR-043)

- Persona "Declaró Vida Nueva" (pendiente), "Declaró Bautismo" (pendiente, con comentario de 500
  caracteres con tildes), "Rechazada" (Vida de Servicio rechazada con motivo), "Confirmada" (Vida
  Nueva por historial), "Anulada" (Completitud de Bautismo anulada y otra vigente).
- Tres Personas sin email (una con pedido de Vida Nueva creado por la Discipuladora 1).
- Par duplicado por teléfono (`+54 9 221 555-0101` y `+54 221 5550101`) y par de homónimos con la
  misma fecha y tildes distintas ("José Pérez" / "Jose Perez").
- Nombres largos y apellidos compuestos en todos los casos anteriores.
