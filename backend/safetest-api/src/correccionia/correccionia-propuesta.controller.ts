import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import type { Request } from 'express';

import { DocenteGuard } from '../auth/guards/docente.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AceptarCorreccionIaDto } from './dto/aceptar-correccion-ia.dto';
import { ActualizarCorreccionIaDto } from './dto/actualizar-correccion-ia.dto';
import { DescartarCorreccionIaDto } from './dto/descartar-correccion-ia.dto';
import { CorreccionIaService } from './correccionia.service';
import {
  CorreccionIaInputGuard,
  ValidarEntradaCorreccionIa,
} from './correccionia-input.guard';

@Controller('correcciones-ia')
@UseGuards(JwtAuthGuard, DocenteGuard, CorreccionIaInputGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  }),
)
export class CorreccionIaPropuestaController {
  constructor(private readonly correccionIa: CorreccionIaService) {}

  private docenteId(request: Request): number {
    return (request.user as { id: number }).id;
  }

  @Get(':propuestaId')
  obtenerDetalle(
    @Param('propuestaId', ParseIntPipe) propuestaId: number,
    @Req() request: Request,
  ) {
    return this.correccionIa.obtenerDetalle(
      propuestaId,
      this.docenteId(request),
    );
  }

  @Patch(':propuestaId')
  @ValidarEntradaCorreccionIa('body', ActualizarCorreccionIaDto)
  modificar(
    @Param('propuestaId', ParseIntPipe) propuestaId: number,
    @Body() cambios: ActualizarCorreccionIaDto,
    @Req() request: Request,
  ) {
    return this.correccionIa.modificarPropuesta(
      propuestaId,
      this.docenteId(request),
      cambios,
    );
  }

  @Post(':propuestaId/aceptar')
  @ValidarEntradaCorreccionIa('body', AceptarCorreccionIaDto)
  @HttpCode(HttpStatus.OK)
  aceptar(
    @Param('propuestaId', ParseIntPipe) propuestaId: number,
    @Body() entrada: AceptarCorreccionIaDto,
    @Req() request: Request,
  ) {
    return this.correccionIa.aceptarPropuesta(
      propuestaId,
      this.docenteId(request),
      entrada,
    );
  }

  @Post(':propuestaId/descartar')
  @ValidarEntradaCorreccionIa('body', DescartarCorreccionIaDto)
  @HttpCode(HttpStatus.OK)
  descartar(
    @Param('propuestaId', ParseIntPipe) propuestaId: number,
    @Body() entrada: DescartarCorreccionIaDto,
    @Req() request: Request,
  ) {
    return this.correccionIa.descartarPropuesta(
      propuestaId,
      this.docenteId(request),
      entrada?.motivo,
    );
  }
}
