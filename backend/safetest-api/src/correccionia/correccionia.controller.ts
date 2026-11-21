import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';

import { DocenteGuard } from '../auth/guards/docente.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CuerpoVacioDto } from './dto/cuerpo-vacio.dto';
import {
  ListarCorreccionesIaDto,
  ListarHistorialCorreccionesIaDto,
} from './dto/listar-correcciones-ia.dto';
import type {
  ListarCorreccionesIaFiltros,
  ListarHistorialCorreccionIaFiltros,
} from './correccionia.service';
import { CorreccionIaService } from './correccionia.service';

@Controller('examenes/:examenId')
@UseGuards(JwtAuthGuard, DocenteGuard)
export class CorreccionIaController {
  constructor(private readonly correccionIa: CorreccionIaService) {}

  private docenteId(request: Request): number {
    return (request.user as { id: number }).id;
  }

  @Post('calificaciones/:estudianteId/respuestas/:preguntaId/:letra/ia')
  @HttpCode(HttpStatus.ACCEPTED)
  solicitar(
    @Param('examenId', ParseIntPipe) examenId: number,
    @Param('estudianteId', ParseIntPipe) estudianteId: number,
    @Param('preguntaId', ParseIntPipe) preguntaId: number,
    @Param('letra') letra: string,
    @Body() _cuerpo: CuerpoVacioDto,
    @Req() request: Request,
  ) {
    return this.correccionIa.solicitarPropuesta(
      examenId,
      estudianteId,
      preguntaId,
      letra,
      this.docenteId(request),
    );
  }

  @Get('calificaciones/:estudianteId/respuestas/:preguntaId/:letra/ia')
  listarHistorial(
    @Param('examenId', ParseIntPipe) examenId: number,
    @Param('estudianteId', ParseIntPipe) estudianteId: number,
    @Param('preguntaId', ParseIntPipe) preguntaId: number,
    @Param('letra') letra: string,
    @Query() filtros: ListarHistorialCorreccionesIaDto,
    @Req() request: Request,
  ) {
    const filtrosServicio: ListarHistorialCorreccionIaFiltros = {
      estado: filtros.estado,
      limite: filtros.limite,
    };

    return this.correccionIa.listarHistorial(
      examenId,
      estudianteId,
      preguntaId,
      letra,
      this.docenteId(request),
      filtrosServicio,
    );
  }

  @Post(
    'calificaciones/:estudianteId/respuestas/:preguntaId/:letra/ia/regenerar',
  )
  @HttpCode(HttpStatus.ACCEPTED)
  regenerar(
    @Param('examenId', ParseIntPipe) examenId: number,
    @Param('estudianteId', ParseIntPipe) estudianteId: number,
    @Param('preguntaId', ParseIntPipe) preguntaId: number,
    @Param('letra') letra: string,
    @Body() _cuerpo: CuerpoVacioDto,
    @Req() request: Request,
  ) {
    return this.correccionIa.regenerarPropuesta(
      examenId,
      estudianteId,
      preguntaId,
      letra,
      this.docenteId(request),
    );
  }

  @Get('correcciones-ia')
  listarPorExamen(
    @Param('examenId', ParseIntPipe) examenId: number,
    @Query() filtros: ListarCorreccionesIaDto,
    @Req() request: Request,
  ) {
    const filtrosServicio: ListarCorreccionesIaFiltros = {
      estado: filtros.estado,
      estudiante_id: filtros.estudiante_id,
      pregunta_id: filtros.pregunta_id,
      solo_pendientes_revision: filtros.solo_pendientes_revision === true,
      limite: filtros.limite,
      desplazamiento: filtros.desplazamiento,
    };

    return this.correccionIa.listarPorExamen(
      examenId,
      this.docenteId(request),
      filtrosServicio,
    );
  }
}
