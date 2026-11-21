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
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import type { Request } from 'express';

import { DocenteGuard } from '../auth/guards/docente.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CuerpoVacioDto } from './dto/cuerpo-vacio.dto';
import {
  ListarCorreccionesIaDto,
  ListarHistorialCorreccionesIaDto,
} from './dto/listar-correcciones-ia.dto';
import {
  CorreccionIaInputGuard,
  ValidarEntradaCorreccionIa,
} from './correccionia-input.guard';
import type {
  ListarCorreccionesIaFiltros,
  ListarHistorialCorreccionIaFiltros,
} from './correccionia.service';
import { CorreccionIaService } from './correccionia.service';

@Controller('examenes/:examenId')
@UseGuards(JwtAuthGuard, DocenteGuard, CorreccionIaInputGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  }),
)
export class CorreccionIaController {
  constructor(private readonly correccionIa: CorreccionIaService) {}

  private docenteId(request: Request): number {
    return (request.user as { id: number }).id;
  }

  @Post('calificaciones/:estudianteId/respuestas/:preguntaId/:letra/ia')
  @ValidarEntradaCorreccionIa('body', CuerpoVacioDto)
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
  @ValidarEntradaCorreccionIa('query', ListarHistorialCorreccionesIaDto)
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
  @ValidarEntradaCorreccionIa('body', CuerpoVacioDto)
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
  @ValidarEntradaCorreccionIa('query', ListarCorreccionesIaDto)
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
