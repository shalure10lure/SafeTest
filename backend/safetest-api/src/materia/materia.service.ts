import {
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Materia } from './entity/materia.entity';
import { CreateMateriaDto } from './dto/create-materia.dto';
import { UpdateMateriaDto } from './dto/update-materia.dto';

@Injectable()
export class MateriaService {
    constructor(
        @InjectRepository(Materia)
        private readonly materiaRepository: Repository<Materia>,
    ) { }

    // Solo las materias del docente autenticado
    findAll(docenteId: number) {
        return this.materiaRepository.find({
            where: { docente_id: docenteId },
            order: { nombre: 'ASC' },
        });
    }

    // Si la materia es de otro docente responde 404 (no revela que existe)
    async findOne(id: number, docenteId: number) {
        const materia = await this.materiaRepository.findOneBy({
            materia_id: id,
            docente_id: docenteId,
        });

        if (!materia) {
            throw new NotFoundException('Materia no encontrada');
        }

        return materia;
    }

    async create(dto: CreateMateriaDto, docenteId: number) {
        const codigo = dto.codigo.trim().toUpperCase();

        await this.validarCodigoUnico(codigo, docenteId);

        const materia = this.materiaRepository.create({
            nombre: dto.nombre.trim(),
            codigo,
            descripcion: dto.descripcion?.trim() || null,
            activo: true,
            docente_id: docenteId,
        });

        return this.materiaRepository.save(materia);
    }

    async update(id: number, dto: UpdateMateriaDto, docenteId: number) {
        const materia = await this.findOne(id, docenteId);

        if (dto.codigo !== undefined) {
            const codigo = dto.codigo.trim().toUpperCase();

            if (codigo !== materia.codigo) {
                await this.validarCodigoUnico(codigo, docenteId);
            }
            materia.codigo = codigo;
        }

        if (dto.nombre !== undefined) materia.nombre = dto.nombre.trim();
        if (dto.descripcion !== undefined) {
            materia.descripcion = dto.descripcion.trim() || null;
        }
        if (dto.activo !== undefined) materia.activo = dto.activo;

        return this.materiaRepository.save(materia);
    }

    private async validarCodigoUnico(codigo: string, docenteId: number) {
        const existe = await this.materiaRepository.existsBy({
            codigo,
            docente_id: docenteId,
        });

        if (existe) {
            throw new ConflictException(
                'Ya tienes una materia con ese código',
            );
        }
    }
}