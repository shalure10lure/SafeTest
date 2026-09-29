import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';

import { CategoriaService } from './categoria.service';
import { CreateCategoriaDto } from './entity/dtos/create-categoria.dto';
import { UpdateCategoriaDto } from './entity/dtos/update-categoria.dto';

@Controller('categorias')
export class CategoriaController {
  constructor(
    private readonly categoriaService: CategoriaService,
  ) {}

  @Get()
  findAll() {
    return this.categoriaService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.categoriaService.findOne(Number(id));
  }

  @Post()
  create(@Body() body: CreateCategoriaDto) {
    return this.categoriaService.create(body);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() body: UpdateCategoriaDto,
  ) {
    return this.categoriaService.update(Number(id), body);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.categoriaService.delete(Number(id));
  }
}