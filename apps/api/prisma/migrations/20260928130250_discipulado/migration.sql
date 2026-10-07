-- CreateEnum
CREATE TYPE "CategoriaCurso" AS ENUM ('vida_nueva');

-- CreateEnum
CREATE TYPE "TipoCurso" AS ENUM ('individual', 'grupal');

-- CreateEnum
CREATE TYPE "ModalidadCurso" AS ENUM ('seguimiento_por_encuentros');

-- CreateEnum
CREATE TYPE "EstadoSolicitud" AS ENUM ('pendiente', 'propuesta', 'aprobada', 'rechazada', 'retirada');

-- CreateEnum
CREATE TYPE "TipoPropuesta" AS ENUM ('nueva', 'reasignacion');

-- CreateEnum
CREATE TYPE "EstadoPropuesta" AS ENUM ('pendiente', 'aceptada', 'declinada', 'retirada');

-- CreateEnum
CREATE TYPE "RetiradaPor" AS ENUM ('admin', 'persona');

-- CreateEnum
CREATE TYPE "EstadoGrupo" AS ENUM ('en_curso', 'finalizado');

-- CreateEnum
CREATE TYPE "MotivoCierreGrupo" AS ENUM ('completado', 'abandonado');

-- CreateEnum
CREATE TYPE "EstadoInscripcion" AS ENUM ('activa', 'completada', 'dada_de_baja', 'abandono');

-- AlterTable
ALTER TABLE "personas" ADD COLUMN     "disponibleDiscipulado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "maxPersonasPorGrupo" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "cursos" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "categoria" "CategoriaCurso" NOT NULL,
    "tipo" "TipoCurso" NOT NULL,
    "modalidad" "ModalidadCurso" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cursos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "franjas_agenda" (
    "id" TEXT NOT NULL,
    "personaId" TEXT NOT NULL,
    "diaSemana" INTEGER NOT NULL,
    "inicio" INTEGER NOT NULL,
    "fin" INTEGER NOT NULL,
    "eliminadaEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "franjas_agenda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "franjas_solicitud" (
    "id" TEXT NOT NULL,
    "solicitudId" TEXT NOT NULL,
    "diaSemana" INTEGER NOT NULL,
    "inicio" INTEGER NOT NULL,
    "fin" INTEGER NOT NULL,

    CONSTRAINT "franjas_solicitud_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "solicitudes_discipulado" (
    "id" TEXT NOT NULL,
    "personaId" TEXT NOT NULL,
    "estado" "EstadoSolicitud" NOT NULL DEFAULT 'pendiente',
    "creadoPorId" TEXT,
    "revisadoPorId" TEXT,
    "revisadaEn" TIMESTAMP(3),
    "grupoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "solicitudes_discipulado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "propuestas_discipulado" (
    "id" TEXT NOT NULL,
    "tipo" "TipoPropuesta" NOT NULL,
    "solicitudId" TEXT,
    "grupoId" TEXT,
    "discipuladorId" TEXT NOT NULL,
    "grupoDestinoId" TEXT,
    "propuestaPorId" TEXT NOT NULL,
    "propuestaEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" "EstadoPropuesta" NOT NULL DEFAULT 'pendiente',
    "respondidaEn" TIMESTAMP(3),
    "motivoDeclinacion" TEXT,
    "retiradaPor" "RetiradaPor",

    CONSTRAINT "propuestas_discipulado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grupos" (
    "id" TEXT NOT NULL,
    "cursoId" TEXT NOT NULL,
    "sedeId" TEXT NOT NULL,
    "estado" "EstadoGrupo" NOT NULL DEFAULT 'en_curso',
    "motivoCierre" "MotivoCierreGrupo",
    "propuestaFinalizacionEn" TIMESTAMP(3),
    "propuestaFinalizacionPorId" TEXT,
    "finalizacionRechazadaEn" TIMESTAMP(3),
    "finalizacionRechazadaMotivo" TEXT,
    "cerradoEn" TIMESTAMP(3),
    "cerradoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "grupos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inscripciones" (
    "id" TEXT NOT NULL,
    "personaId" TEXT NOT NULL,
    "grupoId" TEXT NOT NULL,
    "solicitudId" TEXT NOT NULL,
    "estado" "EstadoInscripcion" NOT NULL DEFAULT 'activa',
    "bajaPropuestaEn" TIMESTAMP(3),
    "bajaPropuestaPorId" TEXT,
    "bajaPropuestaMotivo" TEXT,
    "bajaRechazadaEn" TIMESTAMP(3),
    "bajaRechazadaMotivo" TEXT,
    "cerradaEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inscripciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "liderazgos" (
    "id" TEXT NOT NULL,
    "personaId" TEXT NOT NULL,
    "grupoId" TEXT NOT NULL,
    "desde" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hasta" TIMESTAMP(3),
    "propuestaId" TEXT,
    "cerradoPorId" TEXT,

    CONSTRAINT "liderazgos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "encuentros" (
    "id" TEXT NOT NULL,
    "grupoId" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "capitulos" TEXT NOT NULL,
    "notas" TEXT,
    "registradoPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "encuentros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asistencias" (
    "id" TEXT NOT NULL,
    "encuentroId" TEXT NOT NULL,
    "inscripcionId" TEXT NOT NULL,
    "presente" BOOLEAN NOT NULL,

    CONSTRAINT "asistencias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bloqueos_disponibilidad" (
    "id" TEXT NOT NULL,
    "personaId" TEXT NOT NULL,
    "desde" DATE NOT NULL,
    "hasta" DATE NOT NULL,
    "eliminadoEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bloqueos_disponibilidad_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cursos_categoria_tipo_key" ON "cursos"("categoria", "tipo");

-- CreateIndex
CREATE INDEX "franjas_agenda_personaId_eliminadaEn_idx" ON "franjas_agenda"("personaId", "eliminadaEn");

-- CreateIndex
CREATE INDEX "franjas_solicitud_solicitudId_idx" ON "franjas_solicitud"("solicitudId");

-- CreateIndex
CREATE INDEX "solicitudes_discipulado_personaId_idx" ON "solicitudes_discipulado"("personaId");

-- CreateIndex
CREATE INDEX "solicitudes_discipulado_estado_createdAt_idx" ON "solicitudes_discipulado"("estado", "createdAt");

-- CreateIndex
CREATE INDEX "solicitudes_discipulado_grupoId_idx" ON "solicitudes_discipulado"("grupoId");

-- CreateIndex
CREATE INDEX "propuestas_discipulado_solicitudId_idx" ON "propuestas_discipulado"("solicitudId");

-- CreateIndex
CREATE INDEX "propuestas_discipulado_grupoId_idx" ON "propuestas_discipulado"("grupoId");

-- CreateIndex
CREATE INDEX "propuestas_discipulado_discipuladorId_estado_idx" ON "propuestas_discipulado"("discipuladorId", "estado");

-- CreateIndex
CREATE INDEX "grupos_cursoId_idx" ON "grupos"("cursoId");

-- CreateIndex
CREATE INDEX "grupos_sedeId_idx" ON "grupos"("sedeId");

-- CreateIndex
CREATE INDEX "grupos_estado_idx" ON "grupos"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "inscripciones_solicitudId_key" ON "inscripciones"("solicitudId");

-- CreateIndex
CREATE INDEX "inscripciones_personaId_idx" ON "inscripciones"("personaId");

-- CreateIndex
CREATE INDEX "inscripciones_grupoId_idx" ON "inscripciones"("grupoId");

-- CreateIndex
CREATE UNIQUE INDEX "inscripciones_personaId_grupoId_key" ON "inscripciones"("personaId", "grupoId");

-- CreateIndex
CREATE INDEX "liderazgos_personaId_hasta_idx" ON "liderazgos"("personaId", "hasta");

-- CreateIndex
CREATE INDEX "liderazgos_grupoId_hasta_idx" ON "liderazgos"("grupoId", "hasta");

-- CreateIndex
CREATE INDEX "encuentros_grupoId_fecha_idx" ON "encuentros"("grupoId", "fecha");

-- CreateIndex
CREATE INDEX "asistencias_inscripcionId_idx" ON "asistencias"("inscripcionId");

-- CreateIndex
CREATE UNIQUE INDEX "asistencias_encuentroId_inscripcionId_key" ON "asistencias"("encuentroId", "inscripcionId");

-- CreateIndex
CREATE INDEX "bloqueos_disponibilidad_personaId_hasta_idx" ON "bloqueos_disponibilidad"("personaId", "hasta");

-- AddForeignKey
ALTER TABLE "franjas_solicitud" ADD CONSTRAINT "franjas_solicitud_solicitudId_fkey" FOREIGN KEY ("solicitudId") REFERENCES "solicitudes_discipulado"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grupos" ADD CONSTRAINT "grupos_cursoId_fkey" FOREIGN KEY ("cursoId") REFERENCES "cursos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscripciones" ADD CONSTRAINT "inscripciones_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "grupos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "liderazgos" ADD CONSTRAINT "liderazgos_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "grupos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encuentros" ADD CONSTRAINT "encuentros_grupoId_fkey" FOREIGN KEY ("grupoId") REFERENCES "grupos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asistencias" ADD CONSTRAINT "asistencias_encuentroId_fkey" FOREIGN KEY ("encuentroId") REFERENCES "encuentros"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asistencias" ADD CONSTRAINT "asistencias_inscripcionId_fkey" FOREIGN KEY ("inscripcionId") REFERENCES "inscripciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================================
-- specs/004-vida-nueva-discipulado — CHECK e índices únicos parciales a mano
-- (patrón H-140, como cambios_de_rol): reglas que el schema de Prisma no puede
-- expresar. Son la red de seguridad en la base; el servicio valida además con
-- mensaje por campo.
-- ============================================================================

-- FR-031/FR-032: día 0..6 y fin > inicio, en las dos tablas de franjas.
ALTER TABLE "franjas_agenda" ADD CONSTRAINT "franjas_agenda_dia_y_rango"
  CHECK ("diaSemana" BETWEEN 0 AND 6 AND "fin" > "inicio");
ALTER TABLE "franjas_solicitud" ADD CONSTRAINT "franjas_solicitud_dia_y_rango"
  CHECK ("diaSemana" BETWEEN 0 AND 6 AND "fin" > "inicio");

-- FR-017: un período de no disponibilidad no puede terminar antes de empezar.
ALTER TABLE "bloqueos_disponibilidad" ADD CONSTRAINT "bloqueos_disponibilidad_fin_no_antes_del_inicio"
  CHECK ("hasta" >= "desde");

-- FR-045: el máximo de Personas por Grupo, entre 1 y el tope general (6).
ALTER TABLE "personas" ADD CONSTRAINT "personas_max_por_grupo_en_rango"
  CHECK ("maxPersonasPorGrupo" BETWEEN 1 AND 6);

-- FR-021/FR-042: un Grupo tiene motivo de cierre si y solo si está finalizado.
ALTER TABLE "grupos" ADD CONSTRAINT "grupos_cierre_con_motivo"
  CHECK (("estado" = 'finalizado') = ("motivoCierre" IS NOT NULL));

-- FR-036: una Propuesta `nueva` cuelga de una Solicitud; una `reasignacion`,
-- de un Grupo. Nunca de ninguno ni de los dos a la vez.
ALTER TABLE "propuestas_discipulado" ADD CONSTRAINT "propuestas_tipo_y_origen"
  CHECK (
    ("tipo" = 'nueva' AND "solicitudId" IS NOT NULL AND "grupoId" IS NULL)
    OR ("tipo" = 'reasignacion' AND "grupoId" IS NOT NULL AND "solicitudId" IS NULL)
  );

-- FR-001: un solo pedido ABIERTO por Persona (pendiente o propuesta). Los
-- resueltos (aprobada/rechazada/retirada) no cuentan, así puede volver a pedir.
CREATE UNIQUE INDEX "solicitudes_discipulado_una_abierta"
  ON "solicitudes_discipulado" ("personaId")
  WHERE "estado" IN ('pendiente', 'propuesta');

-- FR-036: una Propuesta pendiente por Solicitud y una por Grupo.
CREATE UNIQUE INDEX "propuestas_una_pendiente_por_solicitud"
  ON "propuestas_discipulado" ("solicitudId")
  WHERE "estado" = 'pendiente' AND "solicitudId" IS NOT NULL;
CREATE UNIQUE INDEX "propuestas_una_pendiente_por_grupo"
  ON "propuestas_discipulado" ("grupoId")
  WHERE "estado" = 'pendiente' AND "grupoId" IS NOT NULL;
