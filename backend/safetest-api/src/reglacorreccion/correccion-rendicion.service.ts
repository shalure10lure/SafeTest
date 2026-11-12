import { Injectable } from '@nestjs/common';
import { In, type EntityManager } from 'typeorm';

import { AsignacionPregunta } from '../asignacionpregunta/entity/asignacionpregunta.entity';
import { Inciso } from '../inciso/entity/inciso.entity';
import { OpcionMarcada } from '../opcionmarcada/entity/opcionmarcada.entity';
import {
  TIPOS_RESPUESTA,
  type TipoRespuesta,
} from '../pregunta/entity/dtos/create-pregunta.dto';
import { RespuestaInciso } from '../respuestainciso/entity/respuestainciso.entity';
import { SolucionInciso } from '../solucioninciso/entity/solucioninciso.entity';
import { SolucionOpcion } from '../solucionopcion/entity/solucionopcion.entity';
import {
  formatearPuntaje,
  puntajeNumerico,
  puntajeSeleccionMultiple,
  puntajeSeleccionUnica,
} from './correccion-puntaje';
import { ReglaCorreccion } from './entity/reglacorreccion.entity';

export interface ResultadoCorreccionRendicion {
  respuestasAutomaticas: number;
  pendientesRevision: number;
  notaFinal: string | null;
  completa: boolean;
}

interface IncisoConPropietario {
  pregunta_id: number;
  letra: string;
  tipo_respuesta: string;
  puntaje_max: string;
  pregunta?: {
    tema?: {
      materia?: { docente_id: number | null } | null;
    } | null;
  } | null;
}

interface ConfiguracionAutomatica {
  puntajeParcial: boolean;
  penalizarIncorrectas: boolean;
  redondeoDecimales: number;
}

const REDONDEO_POR_DEFECTO = 2;

function esTipoValido(tipo: string): tipo is TipoRespuesta {
  return (TIPOS_RESPUESTA as readonly string[]).includes(tipo);
}

function esObjetoPlano(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

function claveInciso(preguntaId: number, letra: string): string {
  return `${preguntaId}:${letra}`;
}

/**
 * Motor de corrección automática de una rendición (HU-29).
 *
 * Se ejecuta dentro de la transacción que finaliza la rendición, usando el
 * `EntityManager` recibido, de modo que las respuestas y la nota se guardan
 * juntas o no se guardan. Solo califica cuando existe la solución almacenada y
 * una regla activa del docente propietario de la pregunta; si falta cualquiera
 * de las dos, deja el inciso pendiente de revisión manual sin inventar valores.
 *
 * Los resultados se escriben únicamente en columnas existentes:
 * `respuesta_inciso.puntaje_obtenido`, `respuesta_inciso.estado_correccion`,
 * `rendicion.nota_final` y `rendicion.estado`.
 */
@Injectable()
export class CorreccionRendicionService {
  async corregirRendicion(
    manager: EntityManager,
    examenId: number,
    estudianteId: number,
  ): Promise<ResultadoCorreccionRendicion> {
    const asignaciones = await manager.getRepository(AsignacionPregunta).find({
      where: { examen_id: examenId, estudiante_id: estudianteId },
      select: { pregunta_id: true },
    });

    const preguntaIds = [
      ...new Set(asignaciones.map((asignacion) => asignacion.pregunta_id)),
    ];

    if (preguntaIds.length === 0) {
      return this.sinCorreccion();
    }

    const incisos = (await manager.getRepository(Inciso).find({
      where: { pregunta_id: In(preguntaIds) },
      relations: { pregunta: { tema: { materia: true } } },
    })) as IncisoConPropietario[];

    if (incisos.length === 0) {
      return this.sinCorreccion();
    }

    const [respuestas, opciones, solucionesInciso, solucionesOpcion] =
      await Promise.all([
        manager.getRepository(RespuestaInciso).find({
          where: {
            estudiante_id: estudianteId,
            examen_id: examenId,
            pregunta_id: In(preguntaIds),
          },
        }),
        manager.getRepository(OpcionMarcada).find({
          where: {
            estudiante_id: estudianteId,
            examen_id: examenId,
            pregunta_id: In(preguntaIds),
          },
        }),
        manager.getRepository(SolucionInciso).find({
          where: { pregunta_id: In(preguntaIds) },
        }),
        manager.getRepository(SolucionOpcion).find({
          where: { pregunta_id: In(preguntaIds) },
        }),
      ]);

    const respuestasPorInciso = new Map(
      respuestas.map((respuesta) => [
        claveInciso(respuesta.pregunta_id, respuesta.letra),
        respuesta,
      ]),
    );

    const opcionesPorInciso = this.agruparOpciones(opciones);

    const solucionesOpcionPorInciso = new Map<string, number[]>();

    for (const solucion of solucionesOpcion) {
      const clave = claveInciso(solucion.pregunta_id, solucion.letra);
      const correctas = solucionesOpcionPorInciso.get(clave) ?? [];

      correctas.push(solucion.nro_opcion);
      solucionesOpcionPorInciso.set(clave, correctas);
    }

    const solucionesIncisoPorInciso = new Map(
      solucionesInciso.map((solucion) => [
        claveInciso(solucion.pregunta_id, solucion.letra),
        solucion,
      ]),
    );

    const reglas = await this.cargarReglas(manager, incisos);
    const reglasPorDocenteTipo = new Map<string, ReglaCorreccion[]>();

    for (const regla of reglas) {
      const clave = `${regla.docente_id}:${regla.tipo_respuesta}`;
      const acumuladas = reglasPorDocenteTipo.get(clave) ?? [];

      acumuladas.push(regla);
      reglasPorDocenteTipo.set(clave, acumuladas);
    }

    const cambios: RespuestaInciso[] = [];
    let respuestasAutomaticas = 0;
    let pendientesRevision = 0;
    let nota = 0;

    for (const inciso of incisos) {
      const clave = claveInciso(inciso.pregunta_id, inciso.letra);
      const respuesta = respuestasPorInciso.get(clave);
      const tipo = inciso.tipo_respuesta;
      const marcadas = opcionesPorInciso.get(clave) ?? [];
      const texto = respuesta?.respuesta_texto?.trim() ?? '';
      const sinRespuesta =
        tipo === 'numerica' ? texto.length === 0 : marcadas.length === 0;

      if (!esTipoValido(tipo)) {
        pendientesRevision += 1;
        this.marcarPendiente(respuesta, cambios);
        continue;
      }

      // Desarrollo: la calificación es siempre manual, incluso cuando la
      // respuesta está vacía. El motor nunca otorga una nota automática a un
      // inciso de desarrollo; queda pendiente de revisión con rúbrica.
      if (tipo === 'desarrollo') {
        pendientesRevision += 1;
        this.marcarPendiente(respuesta, cambios);
        continue;
      }

      const puntajeMax = Number(inciso.puntaje_max);
      const docenteId = inciso.pregunta?.tema?.materia?.docente_id ?? null;
      const regla =
        docenteId === null
          ? undefined
          : this.buscarRegla(reglasPorDocenteTipo, docenteId, tipo);
      const configuracion = regla
        ? this.configuracionAutomatica(regla, tipo)
        : null;

      if (
        !configuracion ||
        !Number.isFinite(puntajeMax) ||
        puntajeMax <= 0
      ) {
        pendientesRevision += 1;
        this.marcarPendiente(respuesta, cambios);
        continue;
      }

      // La respuesta vacía nunca es correcta y solo puede calificarse con 0
      // cuando existe una regla válida y compatible; si falta la regla, el
      // inciso queda pendiente igual que cualquier otra respuesta.
      if (sinRespuesta) {
        respuestasAutomaticas += 1;
        this.marcarAutomatica(respuesta, 0, cambios);
        continue;
      }

      const puntaje = this.calcularPuntaje(
        tipo,
        inciso,
        texto,
        marcadas,
        puntajeMax,
        configuracion,
        solucionesOpcionPorInciso,
        solucionesIncisoPorInciso,
      );

      if (puntaje === null) {
        pendientesRevision += 1;
        this.marcarPendiente(respuesta, cambios);
        continue;
      }

      respuestasAutomaticas += 1;
      nota += puntaje;
      this.marcarAutomatica(respuesta, puntaje, cambios);
    }

    if (cambios.length > 0) {
      await manager.getRepository(RespuestaInciso).save(cambios);
    }

    const completa = incisos.length > 0 && pendientesRevision === 0;

    return {
      respuestasAutomaticas,
      pendientesRevision,
      notaFinal: completa ? formatearPuntaje(nota) : null,
      completa,
    };
  }

  private sinCorreccion(): ResultadoCorreccionRendicion {
    return {
      respuestasAutomaticas: 0,
      pendientesRevision: 0,
      notaFinal: null,
      completa: false,
    };
  }

  private agruparOpciones(
    opciones: { pregunta_id: number; letra: string; nro_opcion: number }[],
  ): Map<string, number[]> {
    const agrupadas = new Map<string, number[]>();

    for (const opcion of opciones) {
      const clave = claveInciso(opcion.pregunta_id, opcion.letra);
      const marcadas = agrupadas.get(clave) ?? [];

      marcadas.push(opcion.nro_opcion);
      agrupadas.set(clave, marcadas);
    }

    return agrupadas;
  }

  private async cargarReglas(
    manager: EntityManager,
    incisos: IncisoConPropietario[],
  ): Promise<ReglaCorreccion[]> {
    const docentes = [
      ...new Set(
        incisos
          .map((inciso) => inciso.pregunta?.tema?.materia?.docente_id)
          .filter((id): id is number => typeof id === 'number'),
      ),
    ];

    const tipos = [
      ...new Set(
        incisos
          .map((inciso) => inciso.tipo_respuesta)
          .filter((tipo): tipo is TipoRespuesta => esTipoValido(tipo)),
      ),
    ];

    if (docentes.length === 0 || tipos.length === 0) {
      return [];
    }

    return manager.getRepository(ReglaCorreccion).find({
      where: {
        docente_id: In(docentes),
        tipo_respuesta: In(tipos),
        activo: true,
      },
    });
  }

  private buscarRegla(
    reglasPorDocenteTipo: Map<string, ReglaCorreccion[]>,
    docenteId: number,
    tipo: TipoRespuesta,
  ): ReglaCorreccion | undefined {
    const reglas = reglasPorDocenteTipo.get(`${docenteId}:${tipo}`) ?? [];

    // La restricción única debería dejar una sola regla. Si hay datos
    // duplicados o inconsistentes, no se aplica ninguna.
    return reglas.length === 1 ? reglas[0] : undefined;
  }

  private configuracionAutomatica(
    regla: ReglaCorreccion,
    tipo: TipoRespuesta,
  ): ConfiguracionAutomatica | null {
    if (regla.tipo_respuesta !== tipo || !regla.activo) return null;
    if (!esObjetoPlano(regla.parametros)) return null;

    const parametros = regla.parametros;

    if (
      parametros.estrategia !== undefined &&
      parametros.estrategia !== 'automatica'
    ) {
      return null;
    }

    const leerBooleano = (nombre: string): boolean | null => {
      const valor = parametros[nombre];
      if (valor === undefined) return false;

      return typeof valor === 'boolean' ? valor : null;
    };

    const puntajeParcial = leerBooleano('puntaje_parcial');
    const penalizarIncorrectas = leerBooleano('penalizar_incorrectas');

    if (puntajeParcial === null || penalizarIncorrectas === null) {
      return null;
    }

    const redondeo = parametros.redondeo_decimales;

    if (
      redondeo !== undefined &&
      !(
        typeof redondeo === 'number' &&
        Number.isInteger(redondeo) &&
        redondeo >= 0 &&
        redondeo <= 6
      )
    ) {
      return null;
    }

    return {
      puntajeParcial,
      penalizarIncorrectas,
      redondeoDecimales:
        redondeo === undefined ? REDONDEO_POR_DEFECTO : redondeo,
    };
  }

  private calcularPuntaje(
    tipo: TipoRespuesta,
    inciso: IncisoConPropietario,
    texto: string,
    marcadas: number[],
    puntajeMax: number,
    configuracion: ConfiguracionAutomatica,
    solucionesOpcion: Map<string, number[]>,
    solucionesInciso: Map<string, SolucionInciso>,
  ): number | null {
    const clave = claveInciso(inciso.pregunta_id, inciso.letra);

    if (tipo === 'numerica') {
      const solucion = solucionesInciso.get(clave);
      const valorCorrecto = Number(solucion?.valor_correcto);

      if (!solucion || !Number.isFinite(valorCorrecto)) return null;

      const tolerancia = Number(solucion.tolerancia);

      return puntajeNumerico({
        puntajeMax,
        respuesta: Number(texto),
        valorCorrecto,
        tolerancia: Number.isFinite(tolerancia) ? tolerancia : 0,
        redondeoDecimales: configuracion.redondeoDecimales,
      });
    }

    const correctas = solucionesOpcion.get(clave) ?? [];

    if (correctas.length === 0) return null;

    if (tipo === 'opcion_multiple') {
      return puntajeSeleccionMultiple({
        puntajeMax,
        correctas,
        seleccionadas: marcadas,
        puntajeParcial: configuracion.puntajeParcial,
        penalizarIncorrectas: configuracion.penalizarIncorrectas,
      });
    }

    return puntajeSeleccionUnica({
      puntajeMax,
      correctas,
      seleccionadas: marcadas,
    });
  }

  private marcarPendiente(
    respuesta: RespuestaInciso | undefined,
    cambios: RespuestaInciso[],
  ): void {
    if (!respuesta) return;

    respuesta.puntaje_obtenido = null;
    respuesta.estado_correccion = 'pendiente';
    cambios.push(respuesta);
  }

  private marcarAutomatica(
    respuesta: RespuestaInciso | undefined,
    puntaje: number,
    cambios: RespuestaInciso[],
  ): void {
    if (!respuesta) return;

    respuesta.puntaje_obtenido = formatearPuntaje(puntaje);
    respuesta.estado_correccion = 'automatica';
    cambios.push(respuesta);
  }
}
