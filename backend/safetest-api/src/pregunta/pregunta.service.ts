
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ExamenPregunta } from '../examenpregunta/entity/examenpregunta.entity';
import { Tema } from '../tema/entity/tema.entity';
import { CreatePreguntaDto } from './entity/dtos/create-pregunta.dto';
import { UpdatePreguntaDto } from './entity/dtos/update-pregunta.dto';
import { Pregunta } from './entity/pregunta.entity';

@Injectable()
export class PreguntaService {
  constructor(
    @InjectRepository(Pregunta)
    private readonly preguntaRepository: Repository<Pregunta>,

    @InjectRepository(Tema)
    private readonly temaRepository: Repository<Tema>,

    @InjectRepository(ExamenPregunta)
    private readonly examenPreguntaRepository: Repository<ExamenPregunta>,
  ) {}

  // Consultar preguntas de las materias del docente autenticado.
  async findAll(docenteId: number) {
    return this.preguntaRepository
      .createQueryBuilder('pregunta')
      .innerJoin('pregunta.tema', 'tema')
      .innerJoin('tema.materia', 'materia')
      .where('materia.docente_id = :docenteId', { docenteId })
      .andWhere('pregunta.activo = :activo', { activo: true })
      .select([
        'pregunta.pregunta_id',
        'pregunta.enunciado',
        'pregunta.tema_id',
        'pregunta.dificultad',
        'pregunta.origen',
        'pregunta.activo',
        'tema.tema_id',
        'tema.nombre_tema',
        'materia.materia_id',
        'materia.nombre',
      ])
      .orderBy('pregunta.pregunta_id', 'DESC')
      .getMany();
  }

  // Consultar una pregunta verificando que pertenezca al docente.
  async findOne(id: number, docenteId: number) {
    const pregunta = await this.preguntaRepository
      .createQueryBuilder('pregunta')
      .innerJoin('pregunta.tema', 'tema')
      .innerJoin('tema.materia', 'materia')
      .where('pregunta.pregunta_id = :id', { id })
      .andWhere('materia.docente_id = :docenteId', { docenteId })
      .andWhere('pregunta.activo = :activo', { activo: true })
      .select([
        'pregunta.pregunta_id',
        'pregunta.enunciado',
        'pregunta.tema_id',
        'pregunta.dificultad',
        'pregunta.origen',
        'pregunta.activo',
        'tema.tema_id',
        'tema.nombre_tema',
        'materia.materia_id',
        'materia.nombre',
      ])
      .getOne();

    if (!pregunta) {
      throw new NotFoundException('Pregunta no encontrada');
    }

    return pregunta;
  }

  // Verificar que el tema pertenezca a una materia activa del docente.
  private async validarTemaDelDocente(
    temaId: number,
    docenteId: number,
  ): Promise<Tema> {
    const tema = await this.temaRepository
      .createQueryBuilder('tema')
      .innerJoin('tema.materia', 'materia')
      .where('tema.tema_id = :temaId', { temaId })
      .andWhere('materia.docente_id = :docenteId', { docenteId })
      .andWhere('materia.activo = :activo', { activo: true })
      .getOne();

    if (!tema) {
      throw new NotFoundException(
        'Tema no encontrado en tus materias activas',
      );
    }

    return tema;
  }

  // Comprobar si la pregunta está vinculada a algún examen.
  private async validarNoVinculadaAExamen(
    preguntaId: number,
  ): Promise<void> {
    const vinculada =
      await this.examenPreguntaRepository.existsBy({
        pregunta_id: preguntaId,
      });

    if (vinculada) {
      throw new ConflictException(
        'No puedes modificar ni desactivar una pregunta vinculada a un examen',
      );
    }
  }

  // Crear una pregunta nueva.
  async create(dto: CreatePreguntaDto, docenteId: number) {
    const tema = await this.validarTemaDelDocente(
      dto.tema_id,
      docenteId,
    );

    const pregunta = this.preguntaRepository.create({
      enunciado: dto.enunciado.trim(),
      tema,
      dificultad: dto.dificultad ?? null,
      origen: 'manual',
      activo: true,
    });

    return this.preguntaRepository.save(pregunta);
  }

  // Actualizar una pregunta existente.
  async update(
    id: number,
    dto: UpdatePreguntaDto,
    docenteId: number,
  ) {
    const pregunta = await this.findOne(id, docenteId);

    await this.validarNoVinculadaAExamen(id);

    if (dto.tema_id !== undefined) {
      const tema = await this.validarTemaDelDocente(
        dto.tema_id,
        docenteId,
      );

      // Actualizar la relación y no solamente el ID.
      pregunta.tema = tema;
      pregunta.tema_id = tema.tema_id;
    }

    if (dto.enunciado !== undefined) {
      pregunta.enunciado = dto.enunciado.trim();
    }

    if (dto.dificultad !== undefined) {
      pregunta.dificultad = dto.dificultad;
    }

    await this.preguntaRepository.save(pregunta);

    // Devolver la pregunta actualizada con su tema.
    return this.findOne(id, docenteId);
  }

  // Baja lógica: no borrar físicamente la pregunta.
  async remove(id: number, docenteId: number) {
    const pregunta = await this.findOne(id, docenteId);

    await this.validarNoVinculadaAExamen(id);

    pregunta.activo = false;

    await this.preguntaRepository.save(pregunta);

    return {
      mensaje: 'Pregunta desactivada correctamente',
    };
  }
}
