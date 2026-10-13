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
import { SemestreService } from './semestre.service';
import { CreatePeriodoDto } from './dto/create-periodo.dto';
import { UpdatePeriodoDto } from './dto/update-periodo.dto';

@Controller('periodos')
@UseGuards(JwtAuthGuard, DocenteGuard)
export class SemestreController {
    constructor(private readonly semestreService: SemestreService) { }

    private docenteId(req: Request): number {
        return (req.user as { id: number }).id;
    }

    @Get()
    findAll(@Req() req: Request) {
        return this.semestreService.findAll(this.docenteId(req));
    }

    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
        return this.semestreService.findOne(id, this.docenteId(req));
    }

    @Post()
    create(@Body() dto: CreatePeriodoDto, @Req() req: Request) {
        return this.semestreService.create(dto, this.docenteId(req));
    }

    @Put(':id')
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdatePeriodoDto,
        @Req() req: Request,
    ) {
        return this.semestreService.update(id, dto, this.docenteId(req));
    }
}