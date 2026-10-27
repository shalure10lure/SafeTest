import {
    Controller,
    Get,
    ParseIntPipe,
    Query,
    Req,
    UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DocenteGuard } from '../auth/guards/docente.guard';
import { PreguntaService } from './pregunta.service';

@Controller('preguntas')
@UseGuards(JwtAuthGuard, DocenteGuard)
export class PreguntaController {
    constructor(private readonly preguntaService: PreguntaService) { }

    // GET /preguntas?materia_id=1
    @Get()
    findAll(
        @Req() req: Request,
        @Query('materia_id', new ParseIntPipe({ optional: true }))
        materiaId?: number,
    ) {
        return this.preguntaService.findAll(
            (req.user as { id: number }).id,
            materiaId,
        );
    }
}