import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
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
}
