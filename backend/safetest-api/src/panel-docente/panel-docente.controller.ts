import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';

import { DocenteGuard } from '../auth/guards/docente.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PanelDocenteService } from './panel-docente.service';

/**
 * Datos de las pantallas "Inicio" y "Resumen" del docente.
 * Siempre se filtra por el docente autenticado: nunca se ve información
 * de otra cuenta.
 */
@Controller('panel-docente')
@UseGuards(JwtAuthGuard, DocenteGuard)
export class PanelDocenteController {
  constructor(private readonly panelDocenteService: PanelDocenteService) {}

  private docenteId(req: Request): number {
    return (req.user as { id: number }).id;
  }

  /** GET /panel-docente/inicio */
  @Get('inicio')
  obtenerInicio(@Req() req: Request) {
    return this.panelDocenteService.obtenerInicio(this.docenteId(req));
  }

  /** GET /panel-docente/resumen-academico */
  @Get('resumen-academico')
  obtenerResumenAcademico(@Req() req: Request) {
    return this.panelDocenteService.obtenerResumenAcademico(
      this.docenteId(req),
    );
  }
}
