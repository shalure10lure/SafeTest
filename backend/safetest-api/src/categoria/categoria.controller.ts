import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DocenteGuard } from '../auth/guards/docente.guard';
import { CategoriaService } from './categoria.service';
import { CreateCategoriaDto } from './entity/dtos/CreateCategoria.dto';
import { UpdateCategoriaDto } from './entity/dtos/UpdateCategoria.dto';

@Controller('categorias')
@UseGuards(JwtAuthGuard, DocenteGuard)
export class CategoriaController {
  constructor(
    private readonly categoriaService: CategoriaService,
  ) {}

  private docenteId(req: Request): number {
    return (req.user as { id: number }).id;
  }

  @Get()
  findAll(@Req() req: Request) {
    return this.categoriaService.findAll(this.docenteId(req));
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
  ) {
    return this.categoriaService.findOne(
      id,
      this.docenteId(req),
    );
  }

  @Post()
  create(
    @Body() body: CreateCategoriaDto,
    @Req() req: Request,
  ) {
    return this.categoriaService.create(
      body,
      this.docenteId(req),
    );
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateCategoriaDto,
    @Req() req: Request,
  ) {
    return this.categoriaService.update(
      id,
      body,
      this.docenteId(req),
    );
  }

  @Delete(':id')
  delete(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
  ) {
    return this.categoriaService.delete(
      id,
      this.docenteId(req),
    );
  }
}
