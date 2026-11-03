-- CreateEnum
CREATE TYPE "FrecuenciaDiaDeServicio" AS ENUM ('semanal', 'mensual');

-- CreateEnum
CREATE TYPE "EstadoFechaDeServicio" AS ENUM ('borrador', 'publicada', 'suspendida');

-- CreateEnum
CREATE TYPE "EstadoTurno" AS ENUM ('asignado', 'cancelado_por_persona', 'quitado');

-- AlterTable
ALTER TABLE "ministerios" ADD COLUMN     "cupoTurno" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "celulas" ADD COLUMN     "cupoTurno" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "dias_de_servicio" (
    "id" TEXT NOT NULL,
    "ministerioId" TEXT NOT NULL,
    "frecuencia" "FrecuenciaDiaDeServicio" NOT NULL,
    "diaSemana" INTEGER NOT NULL,
    "posicionEnMes" INTEGER,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dias_de_servicio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fechas_de_servicio" (
    "id" TEXT NOT NULL,
    "ministerioId" TEXT NOT NULL,
    "dia" DATE NOT NULL,
    "estado" "EstadoFechaDeServicio" NOT NULL DEFAULT 'borrador',
    "publicadaEn" TIMESTAMP(3),
    "publicadaPorId" TEXT,
    "suspendidaEn" TIMESTAMP(3),
    "suspendidaPorId" TEXT,
    "recordatorioEnviadoEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fechas_de_servicio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "turnos" (
    "id" TEXT NOT NULL,
    "fechaId" TEXT NOT NULL,
    "personaId" TEXT NOT NULL,
    "celulaId" TEXT,
    "estado" "EstadoTurno" NOT NULL DEFAULT 'asignado',
    "motivoCancelacion" VARCHAR(200),
    "asignadoPorId" TEXT NOT NULL,
    "asignadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cerradoPorId" TEXT,
    "cerradoEn" TIMESTAMP(3),

    CONSTRAINT "turnos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "dias_de_servicio_ministerioId_idx" ON "dias_de_servicio"("ministerioId");

-- CreateIndex
CREATE UNIQUE INDEX "fechas_de_servicio_ministerioId_dia_key" ON "fechas_de_servicio"("ministerioId", "dia");

-- CreateIndex
CREATE INDEX "turnos_fechaId_idx" ON "turnos"("fechaId");

-- CreateIndex
CREATE INDEX "turnos_personaId_idx" ON "turnos"("personaId");

-- AddForeignKey
ALTER TABLE "dias_de_servicio" ADD CONSTRAINT "dias_de_servicio_ministerioId_fkey" FOREIGN KEY ("ministerioId") REFERENCES "ministerios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fechas_de_servicio" ADD CONSTRAINT "fechas_de_servicio_ministerioId_fkey" FOREIGN KEY ("ministerioId") REFERENCES "ministerios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "turnos" ADD CONSTRAINT "turnos_fechaId_fkey" FOREIGN KEY ("fechaId") REFERENCES "fechas_de_servicio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "turnos" ADD CONSTRAINT "turnos_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "personas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "turnos" ADD CONSTRAINT "turnos_celulaId_fkey" FOREIGN KEY ("celulaId") REFERENCES "celulas"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- D250: una misma regla activa una sola vez por Ministerio (posicionEnMes null cuenta como igual).
CREATE UNIQUE INDEX "dias_de_servicio_regla_activa" ON "dias_de_servicio"("ministerioId", "frecuencia", "diaSemana", COALESCE("posicionEnMes", 0)) WHERE "activo";

-- D255: una Persona, una sola vez por fecha de servicio mientras el turno está asignado.
CREATE UNIQUE INDEX "turnos_una_vez_por_fecha" ON "turnos"("fechaId", "personaId") WHERE "estado" = 'asignado';

-- D250/D251: los rangos válidos también en la base (la API ya los valida).
ALTER TABLE "dias_de_servicio" ADD CONSTRAINT "dias_de_servicio_dia_semana" CHECK ("diaSemana" BETWEEN 0 AND 6);
ALTER TABLE "dias_de_servicio" ADD CONSTRAINT "dias_de_servicio_posicion" CHECK (("frecuencia" = 'semanal' AND "posicionEnMes" IS NULL) OR ("frecuencia" = 'mensual' AND "posicionEnMes" IN (1, 2, 3, 4, -1)));
ALTER TABLE "ministerios" ADD CONSTRAINT "ministerios_cupo_turno" CHECK ("cupoTurno" BETWEEN 1 AND 20);
ALTER TABLE "celulas" ADD CONSTRAINT "celulas_cupo_turno" CHECK ("cupoTurno" BETWEEN 1 AND 20);
