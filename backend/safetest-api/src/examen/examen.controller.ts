import {
    Body,
    Controller,
    Get,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    Put,
    Query,
    Req,
    UseGuards,
} from '@nestjs/common';

import { ExamenService } from './examen.service';
import { CreateExamenDto } from './dto/create-examen.dto';
import { GuardarAsignacionDto } from './dto/guardar-asignacion.dto';
import { GuardarConfiguracionDto } from './dto/guardar-configuracion.dto';
import { GuardarSeleccionDto } from './dto/guardar-seleccion.dto';
import { UpdateExamenDto } from './dto/update-examen.dto';

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

    // GUARDAR LA SELECCIÓN DE PREGUNTAS (paso 2: manual o aleatoria)

    @Put(':id/preguntas')
    guardarSeleccion(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: GuardarSeleccionDto,
        @Req() request: any,
    ) {
        return this.examenService.guardarSeleccion(id, body, request.user.id);
    }

    // GUARDAR LA CONFIGURACIÓN (paso 3)

    @Put(':id/configuracion')
    guardarConfiguracion(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: GuardarConfiguracionDto,
        @Req() request: any,
    ) {
        return this.examenService.guardarConfiguracion(id, body, request.user.id);
    }

    // PARALELOS Y ESTUDIANTES DISPONIBLES PARA ASIGNAR (paso 4)

    @Get(':id/asignacion')
    obtenerAsignacion(
        @Param('id', ParseIntPipe) id: number,
        @Req() request: any,
    ) {
        return this.examenService.obtenerAsignacion(id, request.user.id);
    }

    // GUARDAR LA ASIGNACIÓN (paso 4: paralelos completos o estudiantes específicos)

    @Put(':id/asignacion')
    guardarAsignacion(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: GuardarAsignacionDto,
        @Req() request: any,
    ) {
        return this.examenService.guardarAsignacion(id, body, request.user.id);
    }

    // CONSULTAR UNA EVALUACIÓN

    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number, @Req() request: any) {
        return this.examenService.findOne(id, request.user.id);
    }

    // EDITAR LA INFORMACIÓN GENERAL (paso 1)

    @Patch(':id')
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() body: UpdateExamenDto,
        @Req() request: any,
    ) {
        return this.examenService.update(id, body, request.user.id);
    }

    // CREAR EVALUACIÓN EN BORRADOR

    @Post()
    create(@Body() body: CreateExamenDto, @Req() request: any) {
        return this.examenService.create(body, request.user.id);
    }
}