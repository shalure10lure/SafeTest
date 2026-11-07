import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Req,
  UseGuards,
} from '@nestjs/common';

import { EstudianteGuard } from '../auth/guards/estudiante.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ExamenAccesoService } from './examen-acceso.service';

/**
 * Vista de la evaluación para el estudiante autenticado.
 *
 * No comparte el `DocenteGuard` del controlador de gestión: aquí solo se
 * devuelve la proyección segura y las respuestas correctas únicamente si el
 * docente publicó los resultados.
 */
@Controller('examenes')
@UseGuards(JwtAuthGuard, EstudianteGuard)
export class ExamenEstudianteController {
  constructor(private readonly examenAccesoService: ExamenAccesoService) {}

  @Get(':id/estudiante')
  obtener(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: { user: { id: number } },
  ) {
    return this.examenAccesoService.obtenerVistaEstudiante(
      id,
      request.user.id,
    );
  }
}
