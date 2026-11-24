import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DocenteGuard } from '../auth/guards/docente.guard';
import { RevisionCalificacionesService } from './revision-calificaciones.service';

@Controller('examenes/:examenId/calificaciones')
@UseGuards(JwtAuthGuard, DocenteGuard)
export class RevisionCalificacionesController {
  constructor(private readonly revision: RevisionCalificacionesService) {}

  @Get()
  obtenerResumen(
    @Param('examenId', ParseIntPipe) examenId: number,
    @Req() request: { user: { id: number } },
  ) {
    return this.revision.obtenerResumen(examenId, request.user.id);
  }

  @Get(':estudianteId')
  obtenerDetalle(
    @Param('examenId', ParseIntPipe) examenId: number,
    @Param('estudianteId', ParseIntPipe) estudianteId: number,
    @Req() request: { user: { id: number } },
  ) {
    return this.revision.obtenerDetalle(examenId, estudianteId, request.user.id);
  }

  @Patch(':estudianteId/respuestas/:preguntaId/:letra')
  valorarInciso(
    @Param('examenId', ParseIntPipe) examenId: number,
    @Param('estudianteId', ParseIntPipe) estudianteId: number,
    @Param('preguntaId', ParseIntPipe) preguntaId: number,
    @Param('letra') letra: string,
    @Body() body: unknown,
    @Req() request: { user: { id: number } },
  ) {
    return this.revision.valorarInciso(
      examenId,
      estudianteId,
      preguntaId,
      letra,
      request.user.id,
      body,
    );
  }

  @Patch(':estudianteId/respuestas')
  valorarIncisosEnLote(
    @Param('examenId', ParseIntPipe) examenId: number,
    @Param('estudianteId', ParseIntPipe) estudianteId: number,
    @Body() body: unknown,
    @Req() request: { user: { id: number } },
  ) {
    return this.revision.valorarIncisosEnLote(
      examenId,
      estudianteId,
      request.user.id,
      body,
    );
  }

  @Post('confirmar')
  confirmar(
    @Param('examenId', ParseIntPipe) examenId: number,
    @Req() request: { user: { id: number } },
  ) {
    return this.revision.confirmar(examenId, request.user.id);
  }
}
