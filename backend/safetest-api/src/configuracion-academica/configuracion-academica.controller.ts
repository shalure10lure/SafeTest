import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';

import { DocenteGuard } from '../auth/guards/docente.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ConfiguracionAcademicaService } from './configuracion-academica.service';
import { ConfigurarPeriodoDto } from './dto/configurar-periodo.dto';

/** Asistente de configuración académica (periodo + materias + paralelos). */
@Controller('configuracion-academica')
@UseGuards(JwtAuthGuard, DocenteGuard)
export class ConfiguracionAcademicaController {
    constructor(private readonly servicio: ConfiguracionAcademicaService) {}

    /** POST /configuracion-academica/periodo */
    @Post('periodo')
    configurarPeriodo(@Body() dto: ConfigurarPeriodoDto, @Req() req: Request) {
        const docenteId = (req.user as { id: number }).id;
        return this.servicio.configurarPeriodo(dto, docenteId);
    }
}
