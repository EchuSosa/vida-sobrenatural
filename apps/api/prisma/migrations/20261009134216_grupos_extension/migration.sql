-- spec 014 — Grupos de Extensión (D220–D228). Migración propia: la del lote 0
-- no se edita (specs/IMPLEMENTACION.md §2.1).

-- CreateEnum
CREATE TYPE "DiaSemana" AS ENUM ('lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo');

-- CreateEnum
CREATE TYPE "EstadoSolicitudGrupoExtension" AS ENUM ('pendiente', 'aceptada', 'rechazada', 'retirada', 'finalizada');

-- CreateTable
CREATE TABLE "grupos_extension" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "dias" "DiaSemana"[],
    "horaInicio" TEXT NOT NULL,
    "cupo" INTEGER,
    "edadMinima" INTEGER,
    "edadMaxima" INTEGER,
    "enLaIglesia" BOOLEAN NOT NULL DEFAULT false,
    "sedeId" TEXT,
    "calle" TEXT,
    "numero" TEXT,
    "entreCalle1" TEXT,
    "entreCalle2" TEXT,
    "zona" TEXT,
    "latitud" DOUBLE PRECISION,
    "longitud" DOUBLE PRECISION,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grupos_extension_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lideres_grupo_extension" (
    "id" TEXT NOT NULL,
    "grupoId" TEXT NOT NULL,
    "personaId" TEXT NOT NULL,
    "desde" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hasta" TIMESTAMP(3),

    CONSTRAINT "lideres_grupo_extension_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitudes_grupo_extension" (
    "id" TEXT NOT NULL,
    "personaId" TEXT NOT NULL,
    "grupoId" TEXT NOT NULL,
    "estado" "EstadoSolicitudGrupoExtension" NOT NULL DEFAULT 'pendiente',
    "creadoPorId" TEXT,
    "revisadoPorId" TEXT,
    "revisadaEn" TIMESTAMP(3),
    "mensaje" TEXT,
    "retiradaEn" TIMESTAMP(3),
    "finalizadaEn" TIMESTAMP(3),
    "finalizadaPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "solicitudes_grupo_extension_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "grupos_extension_activo_idx" ON "grupos_extension"("activo");

-- CreateIndex
CREATE INDEX "lideres_grupo_extension_grupoId_idx" ON "lideres_grupo_extension"("grupoId");

-- CreateIndex
CREATE INDEX "lideres_grupo_extension_personaId_idx" ON "lideres_grupo_extension"("personaId");

-- CreateIndex
CREATE INDEX "solicitudes_grupo_extension_personaId_idx" ON "solicitudes_grupo_extension"("personaId");

-- CreateIndex
CREATE INDEX "solicitudes_grupo_extension_grupoId_estado_idx" ON "solicitudes_grupo_extension"("grupoId", "estado");

-- CreateIndex
CREATE INDEX "solicitudes_grupo_extension_estado_createdAt_idx" ON "solicitudes_grupo_extension"("estado", "createdAt");

-- AddForeignKey
ALTER TABLE "grupos_extension" ADD CONSTRAINT "grupos_extension_sedeId_fkey" FOREIGN KEY ("sedeId") REFERENCES "sedes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lideres_grupo_extension" ADD CONSTRAINT "lideres_grupo_extension_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "grupos_extension"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lideres_grupo_extension" ADD CONSTRAINT "lideres_grupo_extension_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "personas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_grupo_extension" ADD CONSTRAINT "solicitudes_grupo_extension_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "personas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "solicitudes_grupo_extension" ADD CONSTRAINT "solicitudes_grupo_extension_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "grupos_extension"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- --- Lo que Prisma no modela (data-model.md) ---

-- D221: forma del Grupo.
ALTER TABLE "grupos_extension"
  ADD CONSTRAINT "grupos_extension_nombre_largo" CHECK (char_length(btrim("nombre")) BETWEEN 1 AND 80),
  ADD CONSTRAINT "grupos_extension_dias" CHECK (cardinality("dias") >= 1),
  ADD CONSTRAINT "grupos_extension_hora" CHECK ("horaInicio" ~ '^([01][0-9]|2[0-3]):(00|15|30|45)$'),
  ADD CONSTRAINT "grupos_extension_cupo" CHECK ("cupo" IS NULL OR "cupo" >= 1),
  ADD CONSTRAINT "grupos_extension_edades" CHECK (
    ("edadMinima" IS NULL OR "edadMinima" BETWEEN 0 AND 120)
    AND ("edadMaxima" IS NULL OR "edadMaxima" BETWEEN 0 AND 120)
    AND ("edadMinima" IS NULL OR "edadMaxima" IS NULL OR "edadMinima" <= "edadMaxima")),
  ADD CONSTRAINT "grupos_extension_lugar" CHECK (
    ("enLaIglesia" AND "sedeId" IS NOT NULL)
    OR (NOT "enLaIglesia" AND "calle" IS NOT NULL AND btrim("calle") <> '' AND "zona" IS NOT NULL AND btrim("zona") <> '')),
  ADD CONSTRAINT "grupos_extension_coordenadas" CHECK (("latitud" IS NULL) = ("longitud" IS NULL));

-- Un líder vigente una sola vez por Grupo.
CREATE UNIQUE INDEX "lideres_grupo_extension_vigente"
  ON "lideres_grupo_extension" ("grupoId", "personaId") WHERE "hasta" IS NULL;

-- D225: una pendiente y una aceptada (la pertenencia) por Persona.
CREATE UNIQUE INDEX "solicitudes_grupo_extension_una_pendiente"
  ON "solicitudes_grupo_extension" ("personaId") WHERE "estado" = 'pendiente';
CREATE UNIQUE INDEX "solicitudes_grupo_extension_una_aceptada"
  ON "solicitudes_grupo_extension" ("personaId") WHERE "estado" = 'aceptada';

ALTER TABLE "solicitudes_grupo_extension"
  ADD CONSTRAINT "solicitudes_grupo_extension_mensaje" CHECK ("mensaje" IS NULL OR char_length("mensaje") <= 500),
  ADD CONSTRAINT "solicitudes_grupo_extension_estados" CHECK (
    ("estado" NOT IN ('aceptada', 'rechazada') OR "revisadaEn" IS NOT NULL)
    AND ("estado" <> 'retirada' OR "retiradaEn" IS NOT NULL)
    AND ("estado" <> 'finalizada' OR "finalizadaEn" IS NOT NULL));

-- --- Bandeja unificada: copia de prisma/vistas/solicitudes_bandeja.sql ---
-- Vista de la bandeja unificada de Solicitudes (D178, D207, D208).
-- ÚNICA fuente versionada: toda migración que cambie la vista copia este
-- archivo entero con CREATE OR REPLACE VIEW (contrato de cinco pasos de
-- specs/013-backoffice-admin/contracts/bandeja-api.md).
--
-- Una rama por tipo (`TipoSolicitud`, packages/shared-types/src/bandeja.ts),
-- todas con la forma base de docs/04. `abierta` = espera una acción del Admin;
-- tiene que coincidir con ESTADOS_ABIERTOS (un test de integración las ata).
CREATE OR REPLACE VIEW "solicitudes_bandeja" AS
  -- 004: Solicitud de Discipulado. La espera de una `propuesta` cuenta desde
  -- la propuesta vigente.
  SELECT 'discipulado'::text AS "tipo", s."id", s."personaId", s."estado"::text AS "estado",
         (s."estado" IN ('pendiente', 'propuesta')) AS "abierta",
         s."createdAt", COALESCE(pr."propuestaEn", s."createdAt") AS "esperaDesde",
         s."creadoPorId", s."revisadoPorId", s."revisadaEn"
    FROM "solicitudes_discipulado" s
    LEFT JOIN "propuestas_discipulado" pr
      ON pr."solicitudId" = s."id" AND pr."estado" = 'pendiente'
  UNION ALL
  -- 006: Declaración de Historial ("Ya lo hice").
  SELECT 'historial', d."id", d."personaId", d."estado"::text,
         (d."estado" = 'pendiente'),
         d."createdAt", d."createdAt",
         d."creadoPorId", d."revisadoPorId", d."revisadaEn"
    FROM "declaraciones_historial" d
  UNION ALL
  -- 008: Solicitud de inscripción a Vida de Servicio.
  SELECT 'vida_de_servicio', v."id", v."personaId", v."estado"::text,
         (v."estado" = 'pendiente'),
         v."createdAt", v."createdAt",
         v."creadoPorId", v."revisadoPorId", v."revisadaEn"
    FROM "solicitudes_vida_servicio" v
  UNION ALL
  -- 009: Postulación a Ministerio.
  SELECT 'postulacion', p."id", p."personaId", p."estado"::text,
         (p."estado" = 'pendiente'),
         p."createdAt", p."createdAt",
         p."creadoPorId", p."revisadoPorId", p."revisadaEn"
    FROM "postulaciones" p
  UNION ALL
  -- 010: Solicitud de Bautismo. Una `aprobada` esperando fecha NO es abierta
  -- (D186): la bandeja la filtra aparte ("Esperando fecha").
  SELECT 'bautismo', b."id", b."personaId", b."estado"::text,
         (b."estado" = 'pendiente'),
         b."createdAt", b."createdAt",
         b."creadoPorId", b."revisadoPorId", b."revisadaEn"
    FROM "solicitudes_bautismo" b
  UNION ALL
  -- 011: Inscripción a Evento. Solo las de Eventos con aprobación llegan a
  -- `pendiente`; una confirmada con pago pendiente no es abierta (D196).
  SELECT 'inscripcion_evento', i."id", i."personaId", i."estado"::text,
         (i."estado" = 'pendiente'),
         i."createdAt", i."createdAt",
         i."creadoPorId", i."revisadoPorId", i."revisadoEn"
    FROM "inscripciones_evento" i
  UNION ALL
  -- 011: Pago (la Persona es la de su Inscripción).
  SELECT 'pago', g."id", ie."personaId", g."estado"::text,
         (g."estado" = 'pendiente_verificacion'),
         g."createdAt", g."createdAt",
         g."creadoPorId", g."verificadoPorId", g."revisadoEn"
    FROM "pagos" g
    JOIN "inscripciones_evento" ie ON ie."id" = g."inscripcionEventoId"
  UNION ALL
  -- 014: Solicitud para sumarse a un Grupo de Extensión (D225, D227). La
  -- `aceptada` es la pertenencia: no espera nada del Admin.
  SELECT 'grupo_extension', x."id", x."personaId", x."estado"::text,
         (x."estado" = 'pendiente'),
         x."createdAt", x."createdAt",
         x."creadoPorId", x."revisadoPorId", x."revisadaEn"
    FROM "solicitudes_grupo_extension" x;
