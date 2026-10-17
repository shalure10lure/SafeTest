
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

import { ParaleloService } from './paralelo.service';

import { CreateParaleloDto } from './entity/dtos/CreateParalelo.dto';
import { UpdateParaleloDto } from './entity/dtos/UpdateParalelo.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DocenteGuard } from '../auth/guards/docente.guard';

@Controller('paralelos')
@UseGuards(JwtAuthGuard, DocenteGuard)
export class ParaleloController {
  constructor(
    private readonly paraleloService: ParaleloService,
  ) {}

  // CREAR PARALELO

  @Post()
  create(
    @Body() body: CreateParaleloDto,
    @Req() request: any,
  ) {
    return this.paraleloService.create(
      body,
      request.user.id,
    );
  }

  // LISTAR PARALELOS DEL DOCENTE

  @Get()
  findAll(@Req() request: any) {
    return this.paraleloService.findAll(
      request.user.id,
    );
  }

  // CONSULTAR UN PARALELO

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: any,
  ) {
    return this.paraleloService.findOne(
      id,
      request.user.id,
    );
  }

  // MODIFICAR PARALELO

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateParaleloDto,
    @Req() request: any,
  ) {
    return this.paraleloService.update(
      id,
      body,
      request.user.id,
    );
  }
}
