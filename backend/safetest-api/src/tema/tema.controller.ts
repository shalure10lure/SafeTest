
import {
  Body,
  Controller,
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
import { TemaService } from './tema.service';
import { CreateTemaDto } from './entity/dtos/create-tema.dto';
import { UpdateTemaDto } from './entity/dtos/update-tema.dto';

@Controller('temas')
@UseGuards(JwtAuthGuard, DocenteGuard)
export class TemaController {
  constructor(private readonly temaService: TemaService) {}

  private docenteId(req: Request): number {
    return (req.user as { id: number }).id;
  }

  @Get()
  findAll(@Req() req: Request) {
    return this.temaService.findAll(this.docenteId(req));
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
  ) {
    return this.temaService.findOne(id, this.docenteId(req));
  }

  @Post()
  create(@Body() dto: CreateTemaDto, @Req() req: Request) {
    return this.temaService.create(dto, this.docenteId(req));
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTemaDto,
    @Req() req: Request,
  ) {
    return this.temaService.update(id, dto, this.docenteId(req));
  }
}
