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
import { TemaService } from './tema.service';

@Controller('temas')
@UseGuards(JwtAuthGuard, DocenteGuard)
export class TemaController {
    constructor(private readonly temaService: TemaService) { }

    // GET /temas?materia_id=1
    @Get()
    findByMateria(
        @Query('materia_id', ParseIntPipe) materiaId: number,
        @Req() req: Request,
    ) {
        return this.temaService.findByMateria(
            materiaId,
            (req.user as { id: number }).id,
        );
    }
}