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
import { IsIn } from 'class-validator';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EstudianteGuard } from '../auth/guards/estudiante.guard';
import { DocenteGuard } from '../auth/guards/docente.guard';
import { SeguridadRendicionService } from './seguridad-rendicion.service';

export class RegistrarEventoSeguridadDto {
  @IsIn(['pestana_oculta'])
  tipo: 'pestana_oculta';
}

@Controller('examenes')
@UseGuards(JwtAuthGuard, EstudianteGuard)
export class SeguridadRendicionEstudianteController {
  constructor(private readonly seguridad: SeguridadRendicionService) {}

  @Post(':id/estudiante/rendicion/seguridad/eventos')
  registrar(
    @Param('id', ParseIntPipe) examenId: number,
    @Body() body: RegistrarEventoSeguridadDto,
    @Req() req: { user: { id: number } },
  ) {
    return this.seguridad.registrarEvento(examenId, req.user.id, body.tipo);
  }
}

@Controller('examenes')
@UseGuards(JwtAuthGuard, DocenteGuard)
export class SeguridadRendicionDocenteController {
  constructor(private readonly seguridad: SeguridadRendicionService) {}

  @Get(':id/seguridad/rendiciones')
  consultar(
    @Param('id', ParseIntPipe) examenId: number,
    @Req() req: { user: { id: number } },
  ) {
    return this.seguridad.obtenerRendiciones(examenId, req.user.id);
  }

  @Patch(':id/seguridad/rendiciones/:estudianteId/desbloquear')
  desbloquear(
    @Param('id', ParseIntPipe) examenId: number,
    @Param('estudianteId', ParseIntPipe) estudianteId: number,
    @Req() req: { user: { id: number } },
  ) {
    return this.seguridad.desbloquear(examenId, estudianteId, req.user.id);
  }
}
