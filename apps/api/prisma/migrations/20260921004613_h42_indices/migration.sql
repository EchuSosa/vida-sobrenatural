-- CreateIndex
CREATE INDEX "personas_sedeId_idx" ON "personas"("sedeId");

-- CreateIndex
CREATE INDEX "personas_estado_idx" ON "personas"("estado");

-- CreateIndex
CREATE INDEX "relaciones_familiares_familiarId_idx" ON "relaciones_familiares"("familiarId");
