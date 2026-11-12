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
  UseInterceptors,
} from '@nestjs/common';
import type { Request } from 'express';

import { DocenteGuard } from '../auth/guards/docente.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CamposPermitidosInterceptor } from './campos-permitidos.interceptor';
import { ActualizarReglaCorreccionDto } from './dto/actualizar-regla-correccion.dto';
import { CrearReglaCorreccionDto } from './dto/crear-regla-correccion.dto';
import { ReglaCorreccionService } from './reglacorreccion.service';

const CAMPOS_REGLA = ['tipo_respuesta', 'parametros', 'activo'] as const;

/**
 * API de reglas de corrección configurables.
 *
 * Solo docentes autenticados. El docente_id sale del JWT y todas las consultas
 * se filtran por él; nunca se acepta un docente_id desde el cliente.
 */
@Controller('reglas-correccion')
@UseGuards(JwtAuthGuard, DocenteGuard)
export class ReglaCorreccionController {
  constructor(private readonly reglaService: ReglaCorreccionService) {}

  private docenteId(req: Request): number {
    return (req.user as { id: number }).id;
  }

  @Post()
  @UseInterceptors(new CamposPermitidosInterceptor(CAMPOS_REGLA))
  crear(@Body() dto: CrearReglaCorreccionDto, @Req() req: Request) {
    return this.reglaService.crear(this.docenteId(req), dto);
  }

  @Get()
  listar(@Req() req: Request) {
    return this.reglaService.listar(this.docenteId(req));
  }

  @Get(':id')
  obtener(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    return this.reglaService.obtener(this.docenteId(req), id);
  }

  @Patch(':id')
  @UseInterceptors(new CamposPermitidosInterceptor(CAMPOS_REGLA))
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarReglaCorreccionDto,
    @Req() req: Request,
  ) {
    return this.reglaService.actualizar(this.docenteId(req), id, dto);
  }
}
