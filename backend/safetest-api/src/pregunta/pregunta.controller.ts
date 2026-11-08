import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
  Res,
  StreamableFile,
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DocenteGuard } from '../auth/guards/docente.guard';
import { PreguntaService } from './pregunta.service';
import { CreatePreguntaDto } from './entity/dtos/create-pregunta.dto';
import { FiltrarPreguntasDto } from './entity/dtos/filtrar-preguntas.dto';
import { UpdatePreguntaDto } from './entity/dtos/update-pregunta.dto';
import { CrearRecursoDto } from './recursos/dto/crear-recurso.dto';
import { RecursosTamanoFilter } from './recursos/recursos-tamano.filter';
import { PreguntaRecursosService } from './recursos/recursos.service';
import type { ArchivoSubido } from './recursos/recursos.types';

@Controller('preguntas')
@UseGuards(JwtAuthGuard, DocenteGuard)
export class PreguntaController {
  constructor(
    private readonly preguntaService: PreguntaService,
    private readonly recursosService: PreguntaRecursosService,
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
    return this.preguntaService.findOneDetalle(
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

  // ---------- HU-12: contenido especializado de la pregunta ----------

  @Get(':id/recursos')
  listarRecursos(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
  ) {
    return this.recursosService.listar(id, this.docenteId(req));
  }

  @Post(':id/recursos/imagen')
  @UseFilters(RecursosTamanoFilter)
  @UseInterceptors(FileInterceptor('archivo'))
  agregarImagen(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() archivo: ArchivoSubido | undefined,
    @Req() req: Request,
  ) {
    return this.recursosService.agregarImagen(
      id,
      this.docenteId(req),
      archivo,
    );
  }

  @Post(':id/recursos')
  agregarContenido(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CrearRecursoDto,
    @Req() req: Request,
  ) {
    return this.recursosService.agregarContenido(
      id,
      this.docenteId(req),
      dto,
    );
  }

  @Get(':id/recursos/:recurso/archivo')
  async obtenerImagen(
    @Param('id', ParseIntPipe) id: number,
    @Param('recurso') recurso: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { contenido, mime } = await this.recursosService.obtenerImagen(
      id,
      this.docenteId(req),
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

  @Delete(':id/recursos/:recurso')
  @HttpCode(HttpStatus.NO_CONTENT)
  async eliminarRecurso(
    @Param('id', ParseIntPipe) id: number,
    @Param('recurso') recurso: string,
    @Req() req: Request,
  ): Promise<void> {
    await this.recursosService.eliminar(id, this.docenteId(req), recurso);
  }
}