import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { EstadisticasService } from './estadisticas.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DocenteGuard } from '../auth/guards/docente.guard';

@Controller('estadisticas')
@UseGuards(JwtAuthGuard, DocenteGuard)
export class EstadisticasController {
  constructor(
    private readonly estadisticasService: EstadisticasService,
  ) {}

  @Get('materias')
  obtenerMaterias(@Req() request: any) {
    return this.estadisticasService.obtenerMaterias(request.user.id);
  }

  @Get('materias/:materiaId')
  obtenerPorMateria(
    @Param('materiaId', ParseIntPipe) materiaId: number,
    @Req() request: any,
  ) {
    return this.estadisticasService.obtenerPorMateria(
      materiaId,
      request.user.id,
    );
  }
  @Post('materias/:materiaId/comparacion')
  compararPeriodos(
    @Param('materiaId', ParseIntPipe) materiaId: number,
    @Body() body: { periodoIds?: number[] },
    @Req() request: any,
  ) {
    return this.estadisticasService.compararPeriodos(
      materiaId,
      request.user.id,
      body?.periodoIds as number[],
    );
  }
}
