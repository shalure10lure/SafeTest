
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DocenteGuard } from '../auth/guards/docente.guard';
import { PreguntaService } from './pregunta.service';
import { CreatePreguntaDto } from './entity/dtos/create-pregunta.dto';
import { FiltrarPreguntasDto } from './entity/dtos/filtrar-preguntas.dto';
import { UpdatePreguntaDto } from './entity/dtos/update-pregunta.dto';

@Controller('preguntas')
@UseGuards(JwtAuthGuard, DocenteGuard)
export class PreguntaController {
  constructor(
    private readonly preguntaService: PreguntaService,
  ) {}

  private docenteId(req: Request): number {
    return (req.user as { id: number }).id;
  }

  @Get()
  findAll(
    @Req() req: Request,
    @Query() filtros: FiltrarPreguntasDto,
  ) {
    return this.preguntaService.findAll(
      this.docenteId(req),
      filtros,
    );
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
  ) {
    return this.preguntaService.findOne(
      id,
      this.docenteId(req),
    );
  }

  @Post()
  create(
    @Body() dto: CreatePreguntaDto,
    @Req() req: Request,
  ) {
    return this.preguntaService.create(
      dto,
      this.docenteId(req),
    );
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePreguntaDto,
    @Req() req: Request,
  ) {
    return this.preguntaService.update(
      id,
      dto,
      this.docenteId(req),
    );
  }

  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
  ) {
    return this.preguntaService.remove(
      id,
      this.docenteId(req),
    );
  }
}
