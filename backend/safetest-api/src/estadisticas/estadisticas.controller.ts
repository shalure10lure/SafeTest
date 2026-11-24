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

import { EstadisticasService } from './estadisticas.service';
import { EstadisticasPanelService } from './estadisticas-panel.service';
import { PanelEstadisticasQueryDto } from './dto/panel-estadisticas.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DocenteGuard } from '../auth/guards/docente.guard';

@Controller('estadisticas')
@UseGuards(JwtAuthGuard, DocenteGuard)
export class EstadisticasController {
  constructor(
    private readonly estadisticasService: EstadisticasService,
    private readonly panelService: EstadisticasPanelService,
  ) {}

  /**
   * Panel completo de estadísticas (KPIs, percentiles, distribución y
   * comparaciones). Todos los filtros son opcionales.
   * Ejemplo: GET /estadisticas/panel?materia_id=3&semestre_id=2
   */
  @Get('panel')
  obtenerPanel(
    @Query() filtros: PanelEstadisticasQueryDto,
    @Req() request: any,
  ) {
    return this.panelService.obtenerPanel(request.user.id, filtros);
  }

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
