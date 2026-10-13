import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { Semestre } from './entity/semestre.entity';
import { Materia } from '../materia/entity/materia.entity';
import { CreatePeriodoDto } from './dto/create-periodo.dto';
import { UpdatePeriodoDto } from './dto/update-periodo.dto';

@Injectable()
export class SemestreService {
    constructor(
        @InjectRepository(Semestre)
        private readonly semestreRepository: Repository<Semestre>,
        @InjectRepository(Materia)
        private readonly materiaRepository: Repository<Materia>,
    ) { }

    findAll(docenteId: number) {
        return this.semestreRepository.find({
            where: { docente_id: docenteId },
            relations: { materias: true },
            order: { semestre_id: 'DESC' },
        });
    }

    // Periodo de otro docente => 404
    async findOne(id: number, docenteId: number) {
        const periodo = await this.semestreRepository.findOne({
            where: { semestre_id: id, docente_id: docenteId },
            relations: { materias: true },
        });

        if (!periodo) {
            throw new NotFoundException('Periodo no encontrado');
        }

        return periodo;
    }

    async create(dto: CreatePeriodoDto, docenteId: number) {
        this.validarFechas(dto.fecha_inicio, dto.fecha_fin);

        const gestion = dto.gestion.trim();
        await this.validarGestionUnica(gestion, docenteId);

        const materias = await this.obtenerMaterias(
            dto.materiaIds ?? [],
            docenteId,
        );

        const periodo = this.semestreRepository.create({
            gestion,
            nro_pruebas: dto.nro_pruebas,
            fecha_inicio: dto.fecha_inicio,
            fecha_fin: dto.fecha_fin,
            activo: true,
            docente_id: docenteId,
            materias,
        });

        return this.semestreRepository.save(periodo);
    }

    async update(id: number, dto: UpdatePeriodoDto, docenteId: number) {
        const periodo = await this.findOne(id, docenteId);

        const inicio = dto.fecha_inicio ?? periodo.fecha_inicio;
        const fin = dto.fecha_fin ?? periodo.fecha_fin;

        if (inicio && fin) {
            this.validarFechas(inicio, fin);
        }

        if (dto.gestion !== undefined) {
            const gestion = dto.gestion.trim();

            if (gestion !== periodo.gestion) {
                await this.validarGestionUnica(gestion, docenteId);
            }
            periodo.gestion = gestion;
        }

        if (dto.nro_pruebas !== undefined) periodo.nro_pruebas = dto.nro_pruebas;
        if (dto.fecha_inicio !== undefined) periodo.fecha_inicio = dto.fecha_inicio;
        if (dto.fecha_fin !== undefined) periodo.fecha_fin = dto.fecha_fin;
        if (dto.activo !== undefined) periodo.activo = dto.activo;

        if (dto.materiaIds !== undefined) {
            periodo.materias = await this.obtenerMaterias(
                dto.materiaIds,
                docenteId,
            );
        }

        return this.semestreRepository.save(periodo);
    }

    private validarFechas(inicio: string, fin: string) {
        if (new Date(fin) < new Date(inicio)) {
            throw new BadRequestException(
                'La fecha de fin no puede ser anterior a la fecha de inicio',
            );
        }
    }

    private async validarGestionUnica(gestion: string, docenteId: number) {
        const existe = await this.semestreRepository.existsBy({
            gestion,
            docente_id: docenteId,
        });

        if (existe) {
            throw new ConflictException('Ya tienes un periodo con esa gestión');
        }
    }

    // Solo permite materias que pertenecen al docente autenticado
    private async obtenerMaterias(ids: number[], docenteId: number) {
        const unicos = [...new Set(ids)];

        if (unicos.length === 0) return [];

        const materias = await this.materiaRepository.find({
            where: { materia_id: In(unicos), docente_id: docenteId },
        });

        if (materias.length !== unicos.length) {
            throw new BadRequestException(
                'Una o más materias no existen o no te pertenecen',
            );
        }

        return materias;
    }
}