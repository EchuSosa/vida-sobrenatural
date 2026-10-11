-- spec 015 — Elección de ministerio al terminar Vida de Servicio (D239–D242).
-- Las notas de la charla son privadas (D240): la API las filtra; acá solo forma.

-- CreateEnum
CREATE TYPE "EstadoEleccionMinisterio" AS ENUM ('borrador', 'charla_hecha', 'resuelta', 'cancelada');

-- CreateEnum
CREATE TYPE "ResultadoOpcionEleccion" AS ENUM ('pendiente', 'confirmada', 'descartada');

-- AlterTable
ALTER TABLE "grupos" ADD COLUMN     "eleccionAbierta" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "elecciones_ministerio" (
    "id" TEXT NOT NULL,
    "personaId" TEXT NOT NULL,
    "grupoId" TEXT NOT NULL,
    "estado" "EstadoEleccionMinisterio" NOT NULL DEFAULT 'borrador',
    "comentario" TEXT,
    "notas" TEXT,
    "notasPorId" TEXT,
    "notasEn" TIMESTAMP(3),
    "charlaPorId" TEXT,
    "charlaEn" TIMESTAMP(3),
    "cargadaPorId" TEXT,
    "editadaPorId" TEXT,
    "resueltaPorId" TEXT,
    "resueltaEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "elecciones_ministerio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opciones_eleccion_ministerio" (
    "id" TEXT NOT NULL,
    "eleccionId" TEXT NOT NULL,
    "ministerioId" TEXT NOT NULL,
    "celulaId" TEXT,
    "enParalelo" BOOLEAN NOT NULL DEFAULT false,
    "resultado" "ResultadoOpcionEleccion" NOT NULL DEFAULT 'pendiente',
    "postulacionId" TEXT,
    "motivoDescarte" TEXT,
    "resueltaPorId" TEXT,
    "resueltaEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "opciones_eleccion_ministerio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "elecciones_ministerio_grupoId_idx" ON "elecciones_ministerio"("grupoId");

-- CreateIndex
CREATE INDEX "elecciones_ministerio_estado_charlaEn_idx" ON "elecciones_ministerio"("estado", "charlaEn");

-- CreateIndex
CREATE UNIQUE INDEX "elecciones_ministerio_personaId_grupoId_key" ON "elecciones_ministerio"("personaId", "grupoId");

-- CreateIndex
CREATE UNIQUE INDEX "opciones_eleccion_ministerio_postulacionId_key" ON "opciones_eleccion_ministerio"("postulacionId");

-- CreateIndex
CREATE UNIQUE INDEX "opciones_eleccion_ministerio_eleccionId_ministerioId_key" ON "opciones_eleccion_ministerio"("eleccionId", "ministerioId");

-- AddForeignKey
ALTER TABLE "elecciones_ministerio" ADD CONSTRAINT "elecciones_ministerio_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "personas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "elecciones_ministerio" ADD CONSTRAINT "elecciones_ministerio_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "grupos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opciones_eleccion_ministerio" ADD CONSTRAINT "opciones_eleccion_ministerio_eleccionId_fkey" FOREIGN KEY ("eleccionId") REFERENCES "elecciones_ministerio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opciones_eleccion_ministerio" ADD CONSTRAINT "opciones_eleccion_ministerio_ministerioId_fkey" FOREIGN KEY ("ministerioId") REFERENCES "ministerios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opciones_eleccion_ministerio" ADD CONSTRAINT "opciones_eleccion_ministerio_celulaId_fkey" FOREIGN KEY ("celulaId") REFERENCES "celulas"("id") ON DELETE SET NULL ON UPDATE CASCADE;



-- Forma de cada estado y largos (docs/04, D239–D242).
ALTER TABLE "elecciones_ministerio"
  ADD CONSTRAINT "elecciones_ministerio_comentario_largo" CHECK ("comentario" IS NULL OR char_length("comentario") <= 500),
  ADD CONSTRAINT "elecciones_ministerio_notas_largo" CHECK ("notas" IS NULL OR char_length("notas") <= 2000),
  ADD CONSTRAINT "elecciones_ministerio_charla" CHECK ("estado" = 'borrador' OR "estado" = 'cancelada' OR "charlaEn" IS NOT NULL),
  ADD CONSTRAINT "elecciones_ministerio_resuelta" CHECK (("estado" = 'resuelta') = ("resueltaEn" IS NOT NULL));

ALTER TABLE "opciones_eleccion_ministerio"
  ADD CONSTRAINT "opciones_eleccion_motivo_largo" CHECK ("motivoDescarte" IS NULL OR char_length("motivoDescarte") <= 500),
  ADD CONSTRAINT "opciones_eleccion_confirmada" CHECK (("resultado" = 'confirmada') = ("postulacionId" IS NOT NULL)),
  ADD CONSTRAINT "opciones_eleccion_resuelta" CHECK (("resultado" = 'pendiente') = ("resueltaEn" IS NULL));

-- La vista de la bandeja suma la rama `eleccion_ministerio` (copia entera de prisma/vistas/solicitudes_bandeja.sql).
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
    FROM "solicitudes_grupo_extension" x
  UNION ALL
  -- 015: Elección de ministerio (D242). Abierta = con la charla hecha: espera
  -- que el Admin confirme cada área; la espera cuenta desde la charla.
  SELECT 'eleccion_ministerio', e."id", e."personaId", e."estado"::text,
         (e."estado" = 'charla_hecha'),
         e."createdAt", COALESCE(e."charlaEn", e."createdAt"),
         e."cargadaPorId", e."resueltaPorId", e."resueltaEn"
    FROM "elecciones_ministerio" e;
