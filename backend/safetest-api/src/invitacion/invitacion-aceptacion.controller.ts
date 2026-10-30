
import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import type { Request } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InvitacionAceptacionService } from './invitacion-aceptacion.service';

@Controller('invitaciones')
@UseGuards(JwtAuthGuard)
export class InvitacionAceptacionController {
  constructor(
    private readonly aceptacionService:
      InvitacionAceptacionService,
  ) { }

  private obtenerEstudianteId(
    request: Request,
  ): number {
    const usuario = request.user as
      | {
        id: number;
        tipo: 'docente' | 'estudiante';
      }
      | undefined;

    if (
      !usuario ||
      usuario.tipo !== 'estudiante'
    ) {
      throw new ForbiddenException(
        'Solo los estudiantes pueden aceptar invitaciones.',
      );
    }

    return usuario.id;
  }

  // Consultar invitación antes de aceptarla.
  @Post('consultar')
  consultar(
    @Req() request: Request,
    @Body('token') token: string,
  ) {
    const estudianteId =
      this.obtenerEstudianteId(request);

    return this.aceptacionService.consultar(
      token,
      estudianteId,
    );
  }

  // Aceptar invitación e inscribir al estudiante.
  @Post('aceptar')
  aceptar(
    @Req() request: Request,
    @Body('token') token: string,
  ) {
    const estudianteId =
      this.obtenerEstudianteId(request);

    return this.aceptacionService.aceptar(
      token,
      estudianteId,
    );
  }

  // Bandeja de invitaciones del estudiante autenticado.
  @Get('mis-invitaciones')
  listarMisInvitaciones(
    @Req() request: Request,
  ) {
    const estudianteId =
      this.obtenerEstudianteId(request);

    return this.aceptacionService
      .listarMisInvitaciones(estudianteId);
  }
  @Post('mis-invitaciones/:id/aceptar')
  aceptarDesdePanel(
    @Req() request: Request,
    @Param('id', ParseIntPipe) invitacionId: number,
  ) {
    const estudianteId =
      this.obtenerEstudianteId(request);

    return this.aceptacionService.aceptarDesdePanel(
      invitacionId,
      estudianteId,
    );
  }
}
