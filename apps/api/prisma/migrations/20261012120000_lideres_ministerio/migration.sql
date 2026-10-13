-- spec 016 (D244): líderes de un Ministerio. Se cierran con `hasta`, no se borran.
CREATE TABLE "lideres_ministerio" (
    "id" TEXT NOT NULL,
    "ministerioId" TEXT NOT NULL,
    "personaId" TEXT NOT NULL,
    "desde" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hasta" TIMESTAMP(3),
    "asignadoPorId" TEXT NOT NULL,
    "quitadoPorId" TEXT,

    CONSTRAINT "lideres_ministerio_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "lideres_ministerio_ministerioId_idx" ON "lideres_ministerio"("ministerioId");
CREATE INDEX "lideres_ministerio_personaId_idx" ON "lideres_ministerio"("personaId");
-- Un solo liderazgo vigente por Persona y Ministerio.
CREATE UNIQUE INDEX "lideres_ministerio_vigente" ON "lideres_ministerio"("ministerioId", "personaId") WHERE "hasta" IS NULL;

ALTER TABLE "lideres_ministerio" ADD CONSTRAINT "lideres_ministerio_ministerioId_fkey" FOREIGN KEY ("ministerioId") REFERENCES "ministerios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "lideres_ministerio" ADD CONSTRAINT "lideres_ministerio_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "personas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
