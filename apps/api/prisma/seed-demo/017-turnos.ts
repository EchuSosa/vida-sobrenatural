import type { ContextoSeedDemo } from './contexto.js';

/**
 * spec 017 — datos de demo de los turnos de servicio, con las respuestas provisorias de docs/06:
 * - D254: "Atención a quienes ministran" y "Limpieza" como Células (áreas) de Bienvenida.
 * - D250: Bienvenida todos los domingos; Ceremonial el segundo domingo (Santa Cena); Vida en acción
 *   todos los sábados (el comedor del Mercadito).
 * - D251: cupos de ejemplo en Bienvenida (Seguridad 2, Atención de la Casa 3); el resto, 1.
 * Idempotente: solo agrega lo que falta.
 */
export async function sembrarDemo017({ prisma }: ContextoSeedDemo): Promise<void> {
  const admin = await prisma.persona.findUnique({ where: { email: 'demo-admin@example.com' }, select: { id: true } });
  if (!admin) return;
  const ministerio = (nombre: string) => prisma.ministerio.findFirst({ where: { nombre, eliminadoEn: null }, select: { id: true } });
  const bienvenida = await ministerio('Ministerio de Bienvenida');
  const ceremonial = await ministerio('Ministerio Ceremonial');
  const vidaEnAccion = await ministerio('Ministerio Vida en acción');

  if (bienvenida) {
    for (const nombre of ['Atención a quienes ministran', 'Limpieza']) {
      const existe = await prisma.celula.findFirst({ where: { ministerioId: bienvenida.id, nombre, eliminadoEn: null }, select: { id: true } });
      if (!existe) await prisma.celula.create({ data: { ministerioId: bienvenida.id, nombre } });
    }
    await prisma.celula.updateMany({ where: { ministerioId: bienvenida.id, nombre: 'Seguridad' }, data: { cupoTurno: 2 } });
    await prisma.celula.updateMany({ where: { ministerioId: bienvenida.id, nombre: 'Atención de la Casa' }, data: { cupoTurno: 3 } });
  }

  const reglas: Array<{ m: { id: string } | null; frecuencia: 'semanal' | 'mensual'; diaSemana: number; posicionEnMes: number | null }> = [
    { m: bienvenida, frecuencia: 'semanal', diaSemana: 0, posicionEnMes: null },
    { m: ceremonial, frecuencia: 'mensual', diaSemana: 0, posicionEnMes: 2 },
    { m: vidaEnAccion, frecuencia: 'semanal', diaSemana: 6, posicionEnMes: null },
  ];
  for (const r of reglas) {
    if (!r.m) continue;
    const existe = await prisma.diaDeServicio.findFirst({
      where: { ministerioId: r.m.id, frecuencia: r.frecuencia, diaSemana: r.diaSemana, posicionEnMes: r.posicionEnMes, activo: true },
      select: { id: true },
    });
    if (!existe) {
      await prisma.diaDeServicio.create({
        data: { ministerioId: r.m.id, frecuencia: r.frecuencia, diaSemana: r.diaSemana, posicionEnMes: r.posicionEnMes, creadoPorId: admin.id },
      });
    }
  }
  console.log('seed-demo 017: días de servicio de Bienvenida, Ceremonial y Vida en acción; Células nuevas de Bienvenida.');
}
