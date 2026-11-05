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
  UploadedFile,
  UseFilters,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';

import { DocenteGuard } from '../auth/guards/docente.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AutorizarMaterialDto } from './dto/autorizar-material.dto';
import { CrearMaterialDto } from './dto/crear-material.dto';
import { FiltrarMaterialesDto } from './dto/filtrar-materiales.dto';
import { MaterialAcademicoService } from './materialacademico.service';
import type { ArchivoSubido } from './materialacademico.types';
import { MaterialesTamanoFilter } from './materiales-tamano.filter';

/**
 * Gestión de materiales académicos.
 *
 * Solo docentes autenticados. El docente_id sale del JWT y el archivo se
 * recibe en el campo multipart "archivo"; no existe ninguna ruta pública que
 * sirva los archivos originales.
 */
@Controller('materiales')
@UseGuards(JwtAuthGuard, DocenteGuard)
@UseFilters(MaterialesTamanoFilter)
export class MaterialAcademicoController {
  constructor(private readonly materialService: MaterialAcademicoService) {}

  private docenteId(req: Request): number {
    return (req.user as { id: number }).id;
  }

  @Post()
  @UseInterceptors(FileInterceptor('archivo'))
  crear(
    @Body() dto: CrearMaterialDto,
    @UploadedFile() archivo: ArchivoSubido | undefined,
    @Req() req: Request,
  ) {
    return this.materialService.crear(this.docenteId(req), dto, archivo);
  }

  @Get()
  listar(@Req() req: Request, @Query() filtros: FiltrarMaterialesDto) {
    return this.materialService.listar(this.docenteId(req), filtros);
  }

  @Get(':id')
  obtener(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    return this.materialService.obtener(this.docenteId(req), id);
  }

  @Get(':id/extraccion')
  estadoExtraccion(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    return this.materialService.estadoExtraccion(this.docenteId(req), id);
  }

  @Put(':id/autorizacion')
  autorizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AutorizarMaterialDto,
    @Req() req: Request,
  ) {
    return this.materialService.autorizar(this.docenteId(req), id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async eliminar(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
  ): Promise<void> {
    await this.materialService.eliminar(this.docenteId(req), id);
  }
}
