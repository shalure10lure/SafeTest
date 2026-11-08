import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { EstudianteGuard } from '../auth/guards/estudiante.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IniciarRendicionDto } from '../rendicion/dto/iniciar-rendicion.dto';
import { GuardarRespuestaEstudianteDto } from '../rendicion/dto/guardar-respuesta-estudiante.dto';
import type { RendicionEstudianteDto } from '../rendicion/dto/rendicion-estudiante.dto';
import type { RespuestaGuardadaEstudianteDto } from '../rendicion/dto/respuesta-guardada-estudiante.dto';
import { RendicionService } from '../rendicion/rendicion.service';
import { ExamenAccesoService } from './examen-acceso.service';
import type { EvaluacionAsignadaDto } from './dto/evaluacion-asignada.dto';
import type { InstruccionesEvaluacionEstudianteDto } from './dto/instrucciones-evaluacion-estudiante.dto';

/**
 * Vista de la evaluación para el estudiante autenticado.
 *
 * No comparte el `DocenteGuard` del controlador de gestión: aquí solo se
 * devuelve la proyección segura y las respuestas correctas únicamente si el
 * docente publicó los resultados.
 */
@Controller('examenes')
@UseGuards(JwtAuthGuard, EstudianteGuard)
export class ExamenEstudianteController {
  constructor(
    private readonly examenAccesoService: ExamenAccesoService,
    private readonly rendicionService: RendicionService,
  ) {}

  @Get('estudiante/evaluaciones')
  listarEvaluaciones(
    @Req() request: { user: { id: number } },
  ): Promise<EvaluacionAsignadaDto[]> {
    return this.examenAccesoService.listarEvaluacionesAsignadas(
      request.user.id,
    );
  }

  @Get(':id/estudiante/instrucciones')
  obtenerInstrucciones(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: { user: { id: number } },
  ): Promise<InstruccionesEvaluacionEstudianteDto> {
    return this.examenAccesoService.obtenerInstruccionesEstudiante(
      id,
      request.user.id,
    );
  }

  @Get(':id/estudiante/rendicion/preguntas')
  consultarPreguntasRendicion(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: { user: { id: number } },
  ) {
    return this.rendicionService.consultarPreguntasActivas(id, request.user.id);
  }

  @Patch(':id/estudiante/rendicion/respuestas/:preguntaId/:letra')
  guardarRespuestaRendicion(
    @Param('id', ParseIntPipe) id: number,
    @Param('preguntaId', ParseIntPipe) preguntaId: number,
    @Param('letra') letra: string,
    @Body() dto: GuardarRespuestaEstudianteDto,
    @Req() request: { user: { id: number } },
  ): Promise<RespuestaGuardadaEstudianteDto> {
    return this.rendicionService.guardarRespuesta(
      id,
      request.user.id,
      preguntaId,
      letra,
      dto,
    );
  }

  @Post(':id/estudiante/rendicion')
  iniciarORecuperarRendicion(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: IniciarRendicionDto,
    @Req() request: { user: { id: number } },
  ): Promise<RendicionEstudianteDto> {
    return this.rendicionService.iniciarORecuperar(id, request.user.id, dto);
  }

  @Get(':id/estudiante')
  obtener(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: { user: { id: number } },
  ) {
    return this.examenAccesoService.obtenerVistaEstudiante(id, request.user.id);
  }
}
