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
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';

import { DocenteGuard } from '../auth/guards/docente.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ActualizarPropuestaIaDto } from './dto/actualizar-propuesta-ia.dto';
import { CrearGeneracionIaDto } from './dto/crear-generacion-ia.dto';
import { FiltrarGeneracionesIaDto } from './dto/filtrar-generaciones-ia.dto';
import { IaGeneracionService } from './iageneracion.service';

/**
 * API de generación de preguntas con IA.
 *
 * Solo docentes autenticados. El docente_id se obtiene del JWT y todas las
 * consultas se filtran por él; nunca se acepta un docente_id del cliente.
 */
@Controller('ia/generaciones')
@UseGuards(JwtAuthGuard, DocenteGuard)
export class IaGeneracionController {
  constructor(private readonly generacionService: IaGeneracionService) {}

  private docenteId(req: Request): number {
    return (req.user as { id: number }).id;
  }

  /** Crea la solicitud y la deja pendiente para el worker. */
  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  crear(@Body() dto: CrearGeneracionIaDto, @Req() req: Request) {
    return this.generacionService.crear(this.docenteId(req), dto);
  }

  /** Lista únicamente las generaciones del docente autenticado. */
  @Get()
  listar(@Req() req: Request, @Query() filtros: FiltrarGeneracionesIaDto) {
    return this.generacionService.listar(this.docenteId(req), filtros);
  }

  /** Estado y propuestas de una generación propia. */
  @Get(':id')
  obtener(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    return this.generacionService.obtener(this.docenteId(req), id);
  }

  /** Edita el contenido de una propuesta propia que siga pendiente. */
  @Patch(':generacionId/propuestas/:propuestaId')
  actualizarPropuesta(
    @Param('generacionId', ParseIntPipe) generacionId: number,
    @Param('propuestaId', ParseIntPipe) propuestaId: number,
    @Body() dto: ActualizarPropuestaIaDto,
    @Req() req: Request,
  ) {
    return this.generacionService.actualizarPropuesta(
      this.docenteId(req),
      generacionId,
      propuestaId,
      dto,
    );
  }

  /** Marca la propuesta como aceptada sin insertarla todavía en el banco. */
  @Post(':generacionId/propuestas/:propuestaId/aceptar')
  @HttpCode(HttpStatus.OK)
  aceptarPropuesta(
    @Param('generacionId', ParseIntPipe) generacionId: number,
    @Param('propuestaId', ParseIntPipe) propuestaId: number,
    @Req() req: Request,
  ) {
    return this.generacionService.aceptarPropuesta(
      this.docenteId(req),
      generacionId,
      propuestaId,
    );
  }

  /** Marca la propuesta como descartada sin modificar el banco. */
  @Post(':generacionId/propuestas/:propuestaId/descartar')
  @HttpCode(HttpStatus.OK)
  descartarPropuesta(
    @Param('generacionId', ParseIntPipe) generacionId: number,
    @Param('propuestaId', ParseIntPipe) propuestaId: number,
    @Req() req: Request,
  ) {
    return this.generacionService.descartarPropuesta(
      this.docenteId(req),
      generacionId,
      propuestaId,
    );
  }

  /** Inserta en el banco una propuesta aceptada, de forma transaccional. */
  @Post(':generacionId/propuestas/:propuestaId/insertar')
  @HttpCode(HttpStatus.OK)
  insertarPropuesta(
    @Param('generacionId', ParseIntPipe) generacionId: number,
    @Param('propuestaId', ParseIntPipe) propuestaId: number,
    @Req() req: Request,
  ) {
    return this.generacionService.insertarPropuesta(
      this.docenteId(req),
      generacionId,
      propuestaId,
    );
  }
}
