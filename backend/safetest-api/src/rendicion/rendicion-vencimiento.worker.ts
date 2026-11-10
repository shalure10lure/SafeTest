
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { Examen } from '../examen/entity/examen.entity';
import { Rendicion } from './entity/rendicion.entity';
import { RendicionService } from './rendicion.service';

@Injectable()
export class RendicionVencimientoWorker
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(
    RendicionVencimientoWorker.name,
  );

  private intervalo: ReturnType<typeof setInterval> | null = null;
  private ejecutando = false;

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly rendicionService: RendicionService,
  ) {}

  onModuleInit(): void {
    // Primera revisión al iniciar el backend.
    void this.procesarVencimientos();

    // Después, revisar cada 10 segundos.
    this.intervalo = setInterval(() => {
      void this.procesarVencimientos();
    }, 10_000);
  }

  onModuleDestroy(): void {
    if (this.intervalo !== null) {
      clearInterval(this.intervalo);
      this.intervalo = null;
    }
  }

  private async procesarVencimientos(): Promise<void> {
    // Impide que dos revisiones del mismo worker se solapen.
    if (this.ejecutando) {
      return;
    }

    this.ejecutando = true;

    try {
      const vencidas = await this.dataSource
        .getRepository(Rendicion)
        .createQueryBuilder('r')
        .innerJoin(
          Examen,
          'e',
          'e.examen_id = r.examen_id',
        )
        .select('r.examen_id', 'examen_id')
        .addSelect('r.estudiante_id', 'estudiante_id')
        .where('r.estado = :estado', {
          estado: 'en_curso',
        })
        .andWhere('e.al_terminar_tiempo = :politica', {
          politica: 'enviar_automatico',
        })
        .andWhere('r.fecha_inicio IS NOT NULL')
        .andWhere(`
          (
            (
              e.duracion_min IS NOT NULL
              AND r.fecha_inicio +
                (e.duracion_min * INTERVAL '1 minute')
                <= CURRENT_TIMESTAMP
            )
            OR
            (
              e.disponible_hasta IS NOT NULL
              AND e.disponible_hasta <= CURRENT_TIMESTAMP
            )
          )
        `)
        .orderBy('r.fecha_inicio', 'ASC')
        .limit(100)
        .getRawMany<{
          examen_id: number | string;
          estudiante_id: number | string;
        }>();

      for (const fila of vencidas) {
        const examenId = Number(fila.examen_id);
        const estudianteId = Number(fila.estudiante_id);

        try {
          const finalizada =
            await this.rendicionService.finalizarSiVencida(
              examenId,
              estudianteId,
            );

          if (finalizada) {
            this.logger.log(
              `Rendición enviada automáticamente: examen=${examenId}, estudiante=${estudianteId}`,
            );
          }
        } catch (error) {
          this.logger.error(
            `No se pudo finalizar la rendición: examen=${examenId}, estudiante=${estudianteId}`,
            error instanceof Error
              ? error.stack
              : String(error),
          );
        }
      }
    } catch (error) {
      this.logger.error(
        'Error al buscar rendiciones vencidas',
        error instanceof Error
          ? error.stack
          : String(error),
      );
    } finally {
      this.ejecutando = false;
    }
  }
}