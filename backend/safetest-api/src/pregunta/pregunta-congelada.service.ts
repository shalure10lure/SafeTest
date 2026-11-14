import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

import { ExamenPoolSnapshotPregunta } from '../examenpoolsnapshot/entity/examen-pool-snapshot-pregunta.entity';
import { Pregunta } from './entity/pregunta.entity';

/** Mensaje único para cualquier intento de mutación de una pregunta congelada. */
export const MENSAJE_PREGUNTA_CONGELADA =
  'La pregunta forma parte de la instantánea de una evaluación publicada y no puede modificarse ni eliminarse';

/**
 * Determina si una pregunta quedó congelada por una instantánea de pool.
 *
 * La congelación se deriva exclusivamente de `examen_pool_snapshot_pregunta`:
 * una vez que la pregunta aparece en una instantánea, la protección es
 * permanente aunque la evaluación cambie de estado o no tenga rendiciones.
 */
@Injectable()
export class PreguntaCongeladaService {
  constructor(
    @InjectRepository(ExamenPoolSnapshotPregunta)
    private readonly snapshotPreguntaRepository: Repository<ExamenPoolSnapshotPregunta>,
  ) {}

  /** Comprueba la existencia de la pregunta en cualquier instantánea. */
  async estaCongelada(
    preguntaId: number,
    manager?: EntityManager,
  ): Promise<boolean> {
    const repositorio = manager
      ? manager.getRepository(ExamenPoolSnapshotPregunta)
      : this.snapshotPreguntaRepository;

    const apariciones = await repositorio.countBy({
      pregunta_id: preguntaId,
    });

    return apariciones > 0;
  }

  /** Lanza un conflicto si la pregunta ya forma parte de una instantánea. */
  async validarModificable(
    preguntaId: number,
    manager?: EntityManager,
  ): Promise<void> {
    if (await this.estaCongelada(preguntaId, manager)) {
      throw new ConflictException(MENSAJE_PREGUNTA_CONGELADA);
    }
  }

  /**
   * Bloquea la fila de `Pregunta` y comprueba la congelación con el mismo
   * `EntityManager`, dentro de la transacción de la operación.
   *
   * `publicar()` bloquea las preguntas candidatas con `FOR UPDATE` antes de
   * insertar la instantánea. Al adquirir aquí ese mismo bloqueo, la
   * comprobación y la escritura quedan serializadas con la publicación:
   *
   * - si la publicación confirma primero, la instantánea ya es visible y la
   *   modificación se rechaza;
   * - si la edición confirma primero, la publicación espera y congela la
   *   versión ya modificada.
   *
   * Debe invocarse únicamente dentro de una transacción; de lo contrario el
   * bloqueo se liberaría al terminar la sentencia.
   */
  async bloquearYValidarModificable(
    preguntaId: number,
    manager: EntityManager,
  ): Promise<Pregunta> {
    const pregunta = await manager.getRepository(Pregunta).findOne({
      where: { pregunta_id: preguntaId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!pregunta) {
      throw new NotFoundException('Pregunta no encontrada');
    }

    // La comprobación ocurre después del bloqueo: si la publicación ya
    // confirmó, su instantánea es visible; si aún no lo hizo, espera aquí.
    if (await this.estaCongelada(preguntaId, manager)) {
      throw new ConflictException(MENSAJE_PREGUNTA_CONGELADA);
    }

    return pregunta;
  }
}
