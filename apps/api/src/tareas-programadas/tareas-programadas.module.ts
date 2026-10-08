import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { TareaEmailsPendientes } from './tarea-emails-pendientes.js';
import { RecordatoriosEventosService } from './recordatorios-eventos.service.js';
import { TareaRecordatoriosEventos } from './tarea-recordatorios-eventos.js';

/**
 * spec 012 (D205, FR-022, FR-038, research #7) — el planificador de tareas
 * programadas. `TAREAS_PROGRAMADAS=false` (tests de integración y e2e) lo deja
 * apagado: las tareas se corren a mano (`pnpm --filter api run tareas:correr
 * <tarea>`) o, en los tests, llamando al servicio. Cada spec que necesite una
 * tarea la escribe en SU módulo con `@Cron`; este módulo solo enciende el
 * planificador y tiene las de la 012.
 */
export const tareasProgramadasEncendidas = () => process.env.TAREAS_PROGRAMADAS !== 'false';

@Module({
  imports: tareasProgramadasEncendidas() ? [ScheduleModule.forRoot()] : [],
  providers: [TareaEmailsPendientes, RecordatoriosEventosService, TareaRecordatoriosEventos],
  exports: [RecordatoriosEventosService],
})
export class TareasProgramadasModule {}
