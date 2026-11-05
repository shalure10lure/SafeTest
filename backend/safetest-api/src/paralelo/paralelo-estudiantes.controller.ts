
import {
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Req,
  UseGuards,
} from '@nestjs/common';

import type { Request } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ParaleloEstudiantesService } from './paralelo-estudiantes.service';

@Controller('paralelos')
@UseGuards(JwtAuthGuard)
export class ParaleloEstudiantesController {
  constructor(
    private readonly estudiantesService:
      ParaleloEstudiantesService,
  ) {}

  @Get(':id/estudiantes')
  listar(
    @Param('id', ParseIntPipe) paraleloId: number,
    @Req() request: Request,
  ) {
    const usuario = request.user as
      | {
          id: number;
          tipo: 'docente' | 'estudiante';
        }
      | undefined;

    if (!usuario || usuario.tipo !== 'docente') {
      throw new ForbiddenException(
        'Solo los docentes pueden consultar estudiantes de sus paralelos.',
      );
    }

    return this.estudiantesService.listarEstudiantes(
      paraleloId,
      usuario.id,
    );
  }
}
