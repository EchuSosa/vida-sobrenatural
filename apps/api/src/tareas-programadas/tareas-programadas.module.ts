import { Module } from '@nestjs/common';

/**
 * spec 012 (D205) — tareas programadas (recordatorios, vencimientos, envío de
 * emails pendientes). Lote 0 global: módulo registrado; la 012 suma
 * `ScheduleModule.forRoot()` (@nestjs/schedule, ya instalado) y lo apaga con
 * `TAREAS_PROGRAMADAS=false` (tests y e2e). Cada spec que necesite una tarea
 * la escribe en SU módulo con `@Cron`, y la 012 solo enciende el planificador.
 */
@Module({})
export class TareasProgramadasModule {}
