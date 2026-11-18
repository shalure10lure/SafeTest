import { Body, Controller, Get, Param, ParseIntPipe, Post, Put, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DocenteGuard } from '../auth/guards/docente.guard';
import { EstudianteGuard } from '../auth/guards/estudiante.guard';
import { PublicacionResultadosService } from './publicacion-resultados.service';
import { EnvioResultadosCorreoService } from './envio-resultados-correo.service';

/** Nunca confundir publicar el EXAMEN con publicar sus RESULTADOS. */
@Controller('examenes/:examenId/resultados')
@UseGuards(JwtAuthGuard, DocenteGuard)
export class PublicacionResultadosDocenteController {
  constructor(
    private readonly resultados: PublicacionResultadosService,
    private readonly correos: EnvioResultadosCorreoService,
  ) {}

  @Get('correo')
  obtenerCorreo(
    @Param('examenId', ParseIntPipe) examenId: number,
    @Req() req: { user: { id: number } },
  ) {
    return this.correos.obtenerEstado(examenId, req.user.id);
  }

  @Put('correo')
  configurarCorreo(
    @Param('examenId', ParseIntPipe) examenId: number,
    @Body() body: { enviar_resultados_correo?: unknown },
    @Req() req: { user: { id: number } },
  ) {
    return this.correos.configurar(examenId, req.user.id, body?.enviar_resultados_correo);
  }

  @Post('correo/reintentar')
  reintentarCorreos(
    @Param('examenId', ParseIntPipe) examenId: number,
    @Req() req: { user: { id: number } },
  ) {
    return this.correos.reintentar(examenId, req.user.id);
  }

  @Post('publicar')
  publicar(
    @Param('examenId', ParseIntPipe) examenId: number,
    @Req() req: { user: { id: number } },
  ) {
    return this.resultados.publicar(examenId, req.user.id);
  }
}

/** Los IDs de estudiante nunca llegan desde la URL; provienen del JWT. */
@Controller('estudiante/resultados')
@UseGuards(JwtAuthGuard, EstudianteGuard)
export class PublicacionResultadosEstudianteController {
  constructor(private readonly resultados: PublicacionResultadosService) {}

  @Get()
  listar(@Req() req: { user: { id: number } }) {
    return this.resultados.listarParaEstudiante(req.user.id);
  }

  @Get(':examenId')
  detalle(
    @Param('examenId', ParseIntPipe) examenId: number,
    @Req() req: { user: { id: number } },
  ) {
    return this.resultados.detalleParaEstudiante(examenId, req.user.id);
  }
}
