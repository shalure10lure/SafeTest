import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Req,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';

import { EstudianteGuard } from '../auth/guards/estudiante.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PreguntaRecursosService } from '../pregunta/recursos/recursos.service';
import type { RecursoPregunta } from '../pregunta/recursos/recursos.types';
import { RendicionService } from '../rendicion/rendicion.service';

/**
 * Contenido especializado (fórmulas, tablas, imágenes) de las preguntas de la
 * rendición en curso. Solo se entrega si la pregunta fue asignada al propio
 * estudiante autenticado; la identidad sale del JWT, nunca de la solicitud.
 */
@Controller('examenes')
@UseGuards(JwtAuthGuard, EstudianteGuard)
export class ExamenEstudianteRecursosController {
  constructor(
    private readonly rendicionService: RendicionService,
    private readonly recursosService: PreguntaRecursosService,
  ) {}

  @Get(':id/estudiante/rendicion/preguntas/:preguntaId/recursos')
  async listarRecursos(
    @Param('id', ParseIntPipe) id: number,
    @Param('preguntaId', ParseIntPipe) preguntaId: number,
    @Req() request: { user: { id: number } },
  ): Promise<RecursoPregunta[]> {
    await this.rendicionService.verificarPreguntaDeRendicionActiva(
      id,
      request.user.id,
      preguntaId,
    );

    return this.recursosService.listarParaRendicion(preguntaId);
  }

  @Get(':id/estudiante/rendicion/preguntas/:preguntaId/recursos/:recurso/archivo')
  async obtenerImagen(
    @Param('id', ParseIntPipe) id: number,
    @Param('preguntaId', ParseIntPipe) preguntaId: number,
    @Param('recurso') recurso: string,
    @Req() request: { user: { id: number } },
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    await this.rendicionService.verificarPreguntaDeRendicionActiva(
      id,
      request.user.id,
      preguntaId,
    );

    const { contenido, mime } =
      await this.recursosService.obtenerImagenParaRendicion(
        preguntaId,
        recurso,
      );

    res.set({
      'Content-Type': mime,
      'Content-Disposition': 'inline',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, max-age=3600',
    });

    return new StreamableFile(contenido);
  }
}
