import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';

import { ExamenService } from './examen.service';
import { CreateExamenDto } from './dto/create-examen.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DocenteGuard } from '../auth/guards/docente.guard';

@Controller('examenes')
@UseGuards(JwtAuthGuard, DocenteGuard)
export class ExamenController {
    constructor(private readonly examenService: ExamenService) { }

    // CREAR EVALUACIÓN EN BORRADOR

    @Post()
    create(@Body() body: CreateExamenDto, @Req() request: any) {
        return this.examenService.create(body, request.user.id);
    }
}