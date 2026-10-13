import {
    Body,
    Controller,
    Get,
    Param,
    ParseIntPipe,
    Post,
    Put,
    Req,
    UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DocenteGuard } from '../auth/guards/docente.guard';
import { MateriaService } from './materia.service';
import { CreateMateriaDto } from './dto/create-materia.dto';
import { UpdateMateriaDto } from './dto/update-materia.dto';

@Controller('materias')
@UseGuards(JwtAuthGuard, DocenteGuard)
export class MateriaController {
    constructor(private readonly materiaService: MateriaService) { }

    private docenteId(req: Request): number {
        return (req.user as { id: number }).id;
    }

    @Get()
    findAll(@Req() req: Request) {
        return this.materiaService.findAll(this.docenteId(req));
    }

    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
        return this.materiaService.findOne(id, this.docenteId(req));
    }

    @Post()
    create(@Body() dto: CreateMateriaDto, @Req() req: Request) {
        return this.materiaService.create(dto, this.docenteId(req));
    }

    @Put(':id')
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateMateriaDto,
        @Req() req: Request,
    ) {
        return this.materiaService.update(id, dto, this.docenteId(req));
    }
}