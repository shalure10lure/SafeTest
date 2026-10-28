import {
    Body,
    Controller,
    Get,
    Param,
    ParseIntPipe,
    Post,
    Query,
    Req,
    UseGuards,
} from '@nestjs/common';

import { ExamenService } from './examen.service';
import { CreateExamenDto } from './dto/create-examen.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DocenteGuard } from '../auth/guards/docente.guard';

@Controller('examenes')
@UseGuards(JwtAuthGuard, DocenteGuard)
export class ExamenController {
    constructor(private readonly examenService: ExamenService) { }

    // LISTAR EVALUACIONES DEL DOCENTE

    @Get()
    findAll(@Req() request: any) {
        return this.examenService.findAll(request.user.id);
    }

    // BANCO DE PREGUNTAS PARA ARMAR LA EVALUACIÓN

    @Get(':id/banco')
    getBanco(
        @Param('id', ParseIntPipe) id: number,
        @Query('materia_id', new ParseIntPipe({ optional: true }))
        materiaId: number | undefined,
        @Req() request: any,
    ) {
        return this.examenService.getBanco(id, request.user.id, materiaId);
    }

    // CONSULTAR UNA EVALUACIÓN

    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number, @Req() request: any) {
        return this.examenService.findOne(id, request.user.id);
    }

    // CREAR EVALUACIÓN EN BORRADOR

    @Post()
    create(@Body() body: CreateExamenDto, @Req() request: any) {
        return this.examenService.create(body, request.user.id);
    }
}