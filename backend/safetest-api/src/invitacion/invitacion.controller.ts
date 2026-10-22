
import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DocenteGuard } from '../auth/guards/docente.guard';
import { InvitacionService } from './invitacion.service';
import { CreateInvitacionDto } from './dto/create-invitacion.dto';

@Controller('paralelos/:id/invitaciones')
@UseGuards(JwtAuthGuard, DocenteGuard)
export class InvitacionController {
  constructor(
    private readonly invitacionService: InvitacionService,
  ) {}

  @Get()
  findAll(
    @Param('id', ParseIntPipe) id: number,
    @Req() request: any,
  ) {
    return this.invitacionService.findAll(
      id,
      request.user.id,
    );
  }

  @Post()
  create(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CreateInvitacionDto,
    @Req() request: any,
  ) {
    return this.invitacionService.create(
      id,
      request.user.id,
      body,
    );
  }
}
