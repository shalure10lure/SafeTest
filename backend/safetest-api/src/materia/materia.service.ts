import {
    BadRequestException,
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { Materia } from './entity/materia.entity';
import { CreateMateriaDto } from './dto/create-materia.dto';
import { CreateMateriasLoteDto } from './dto/create-materias-lote.dto';
import { UpdateMateriaDto } from './dto/update-materia.dto';
import {
    mensajeBloqueoEliminacion,
    normalizarMaterias,
} from '../configuracion-academica/gestion-academica.utils';

@Injectable()
export class MateriaService {
    constructor(
        @InjectRepository(Materia)
        private readonly materiaRepository: Repository<Materia>,
        // Para contar los datos que dependen de una materia antes de eliminarla
        private readonly dataSource: DataSource,
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

    /**
     * Crea varias materias de una sola vez (todo o nada).
     * Si alguna fila tiene problemas no se guarda ninguna y se responde
     * con la lista de errores por fila para marcarlos en pantalla.
     */
    async createLote(dto: CreateMateriasLoteDto, docenteId: number) {
        const existentes = await this.materiaRepository.find({
            where: { docente_id: docenteId },
            select: { codigo: true },
        });

        const { materias, errores } = normalizarMaterias(
            dto.materias,
            existentes.map((materia) => materia.codigo),
        );

        if (errores.length > 0) {
            throw new BadRequestException({
                message: 'Revisa las materias marcadas en rojo',
                errores,
            });
        }

        const entidades = materias.map((materia) =>
            this.materiaRepository.create({
                ...materia,
                activo: true,
                docente_id: docenteId,
            }),
        );

        // save() con un arreglo se ejecuta en una sola transacción
        return this.materiaRepository.save(entidades);
    }

    /**
     * Elimina una materia propia SOLO si nada depende de ella.
     * Si tiene paralelos, evaluaciones, temas o materiales responde 409
     * explicando por qué y sugiriendo desactivarla.
     */
    async remove(id: number, docenteId: number) {
        await this.findOne(id, docenteId); // 404 si no existe o es de otro docente

        const [fila] = await this.dataSource.query(
            `SELECT
                (SELECT COUNT(*)::int FROM paralelo WHERE materia_id = $1) AS paralelos,
                (SELECT COUNT(*)::int FROM examen WHERE materia_id = $1) AS evaluaciones,
                (SELECT COUNT(*)::int FROM tema WHERE materia_id = $1) AS temas,
                (SELECT COUNT(*)::int FROM material_academico WHERE materia_id = $1) AS materiales`,
            [id],
        );

        const bloqueo = mensajeBloqueoEliminacion('materia', {
            paralelos: Number(fila.paralelos),
            evaluaciones: Number(fila.evaluaciones),
            temas: Number(fila.temas),
            materiales: Number(fila.materiales),
        });

        if (bloqueo) throw new ConflictException(bloqueo);

        await this.materiaRepository.delete({
            materia_id: id,
            docente_id: docenteId,
        });

        return { eliminado: true };
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
