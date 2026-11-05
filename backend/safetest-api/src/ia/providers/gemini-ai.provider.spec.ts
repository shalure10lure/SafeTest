import type { SolicitudGeneracionIa } from '../ai.types';
import {
  cargarConfiguracionIa,
  ErrorConfiguracionIa,
  type IaConfig,
} from '../../config/ia.config';
import { ErrorGeneracionIa } from '../ia.errors';
import { GeminiAiProvider } from './gemini-ai.provider';
import type {
  ClienteGemini,
  PeticionGemini,
  RespuestaGemini,
} from './gemini-client';

const MATERIAL_SENSIBLE =
  'Contenido confidencial del material de clase que no debe filtrarse.';

class ClienteFalso implements ClienteGemini {
  readonly peticiones: PeticionGemini[] = [];

  constructor(
    private readonly responder: (
      peticion: PeticionGemini,
    ) => Promise<RespuestaGemini>,
  ) {}

  generarContenido(peticion: PeticionGemini): Promise<RespuestaGemini> {
    this.peticiones.push(peticion);

    return this.responder(peticion);
  }
}

function crearSolicitud(
  sobrescribir: Partial<SolicitudGeneracionIa> = {},
): SolicitudGeneracionIa {
  return {
    materia: 'Matemática',
    tema: 'Derivadas',
    tipo_respuesta: 'opcion_unica',
    cantidad: 2,
    dificultad: 'media',
    materiales: [{ titulo: 'Apunte 1', texto: MATERIAL_SENSIBLE }],
    ...sobrescribir,
  };
}

function crearConfig(env: Record<string, string> = {}): IaConfig {
  return cargarConfiguracionIa({
    IA_PROVIDER: 'gemini',
    GEMINI_API_KEY: 'clave-de-prueba',
    GEMINI_MODEL: 'modelo-de-prueba',
    GEMINI_TIMEOUT_MS: '50',
    ...env,
  });
}

function respuestaCon(preguntas: unknown): RespuestaGemini {
  return {
    texto: JSON.stringify({ preguntas }),
    motivoFinalizacion: 'STOP',
    bloqueo: null,
    tokens: { entrada: 10, salida: 20, total: 30 },
  };
}

const PREGUNTA_UNICA_VALIDA = {
  enunciado: '¿Cuál es la derivada de x²?',
  opciones: [
    { texto_opcion: '2x', es_correcta: true },
    { texto_opcion: 'x', es_correcta: false },
  ],
  explicacion: 'Se aplica la regla de la potencia.',
};

function crearProveedor(
  respuesta: RespuestaGemini | Error,
  config: IaConfig = crearConfig(),
): { proveedor: GeminiAiProvider; cliente: ClienteFalso } {
  const cliente = new ClienteFalso(() =>
    respuesta instanceof Error
      ? Promise.reject(respuesta)
      : Promise.resolve(respuesta),
  );

  return { proveedor: new GeminiAiProvider({ config, cliente }), cliente };
}

describe('GeminiAiProvider', () => {
  it('devuelve las propuestas válidas con proveedor, modelo y tokens', async () => {
    const { proveedor } = crearProveedor(
      respuestaCon([
        PREGUNTA_UNICA_VALIDA,
        {
          enunciado: '¿Cuál es la derivada de una constante?',
          opciones: [
            { texto_opcion: '0', es_correcta: true },
            { texto_opcion: '1', es_correcta: false },
          ],
        },
      ]),
    );

    const resultado = await proveedor.generarPreguntas(
      crearSolicitud({ cantidad: 2 }),
    );

    expect(resultado.proveedor).toBe('gemini');
    expect(resultado.modelo).toBe('modelo-de-prueba');
    expect(resultado.tokens).toEqual({ entrada: 10, salida: 20, total: 30 });
    expect(resultado.preguntas).toHaveLength(2);
    expect(resultado.preguntas[0]).toEqual({
      enunciado: '¿Cuál es la derivada de x²?',
      tipo_respuesta: 'opcion_unica',
      explicacion: 'Se aplica la regla de la potencia.',
      opciones: [
        { texto_opcion: '2x', es_correcta: true },
        { texto_opcion: 'x', es_correcta: false },
      ],
    });
  });

  it('envía el material, la instrucción de sistema y el esquema estructurado', async () => {
    const { proveedor, cliente } = crearProveedor(
      respuestaCon([PREGUNTA_UNICA_VALIDA]),
    );

    await proveedor.generarPreguntas(crearSolicitud({ cantidad: 1 }));

    const [peticion] = cliente.peticiones;

    expect(peticion.modelo).toBe('modelo-de-prueba');
    expect(peticion.contenido).toContain('Materia: Matemática');
    expect(peticion.contenido).toContain('Tema: Derivadas');
    expect(peticion.contenido).toContain(MATERIAL_SENSIBLE);
    expect(peticion.instruccionSistema).toContain('docente experto');
    expect(peticion.instruccionSistema).toContain('fuente principal');
    expect(peticion.instruccionSistema).toContain('preguntas": []');
    expect(peticion.maxOutputTokens).toBe(8192);
    expect(peticion.timeoutMs).toBe(50);
    expect(peticion.senalAborto).toBeInstanceOf(AbortSignal);
    expect(peticion.esquemaJson).toMatchObject({
      type: 'object',
      required: ['preguntas'],
    });
  });

  it('rechaza una respuesta que no es JSON válido', async () => {
    const { proveedor } = crearProveedor({
      texto: 'esto no es json',
      motivoFinalizacion: 'STOP',
      bloqueo: null,
      tokens: { entrada: null, salida: null, total: null },
    });

    await expect(proveedor.generarPreguntas(crearSolicitud())).rejects.toMatchObject(
      { motivo: 'respuesta_invalida' },
    );
  });

  it('rechaza una respuesta sin la lista de preguntas', async () => {
    const { proveedor } = crearProveedor({
      texto: JSON.stringify({ resultado: [] }),
      motivoFinalizacion: 'STOP',
      bloqueo: null,
      tokens: { entrada: null, salida: null, total: null },
    });

    await expect(
      proveedor.generarPreguntas(crearSolicitud()),
    ).rejects.toBeInstanceOf(ErrorGeneracionIa);
  });

  it('falla en lugar de guardar un resultado incompleto tras descartar propuestas', async () => {
    const { proveedor } = crearProveedor(
      respuestaCon([
        {
          enunciado: 'Pregunta con dos respuestas correctas',
          opciones: [
            { texto_opcion: 'A', es_correcta: true },
            { texto_opcion: 'B', es_correcta: true },
          ],
        },
        {
          enunciado: 'Pregunta con opciones repetidas',
          opciones: [
            { texto_opcion: 'A', es_correcta: true },
            { texto_opcion: 'a', es_correcta: false },
          ],
        },
        PREGUNTA_UNICA_VALIDA,
      ]),
    );

    await expect(
      proveedor.generarPreguntas(crearSolicitud({ cantidad: 2 })),
    ).rejects.toMatchObject({ motivo: 'respuesta_invalida' });
  });

  it('descarta preguntas repetidas ignorando mayúsculas y espacios', async () => {
    const { proveedor } = crearProveedor(
      respuestaCon([
        PREGUNTA_UNICA_VALIDA,
        {
          ...PREGUNTA_UNICA_VALIDA,
          enunciado: '  ¿CUÁL ES LA DERIVADA DE X²?  ',
        },
      ]),
    );

    await expect(
      proveedor.generarPreguntas(crearSolicitud({ cantidad: 2 })),
    ).rejects.toMatchObject({ motivo: 'respuesta_invalida' });
  });

  it('falla cuando ninguna propuesta cumple las reglas del banco', async () => {
    const { proveedor } = crearProveedor(
      respuestaCon([{ enunciado: 'Sin opciones' }]),
    );

    await expect(proveedor.generarPreguntas(crearSolicitud())).rejects.toMatchObject(
      { motivo: 'respuesta_invalida' },
    );
  });

  it('normaliza preguntas numéricas y aplica tolerancia 0 por defecto', async () => {
    const { proveedor } = crearProveedor(
      respuestaCon([{ enunciado: '¿Cuánto es 2 + 2?', valor_correcto: 4 }]),
    );

    const resultado = await proveedor.generarPreguntas(
      crearSolicitud({ tipo_respuesta: 'numerica', cantidad: 1 }),
    );

    expect(resultado.preguntas[0]).toEqual({
      enunciado: '¿Cuánto es 2 + 2?',
      tipo_respuesta: 'numerica',
      valor_correcto: 4,
      tolerancia: 0,
    });
  });

  it('valida las etiquetas de verdadero/falso y las respuestas de desarrollo', async () => {
    const { proveedor } = crearProveedor(
      respuestaCon([
        {
          enunciado: 'La derivada de una constante es 0.',
          opciones: [
            { texto_opcion: 'Verdadero', es_correcta: true },
            { texto_opcion: 'Falso', es_correcta: false },
          ],
        },
      ]),
    );

    const verdaderoFalso = await proveedor.generarPreguntas(
      crearSolicitud({ tipo_respuesta: 'verdadero_falso', cantidad: 1 }),
    );
    expect(verdaderoFalso.preguntas).toHaveLength(1);

    const { proveedor: proveedorDesarrollo } = crearProveedor(
      respuestaCon([
        { enunciado: 'Explica la regla de la cadena.', solucion_referencia: 'Se compone...' },
      ]),
    );

    const desarrollo = await proveedorDesarrollo.generarPreguntas(
      crearSolicitud({ tipo_respuesta: 'desarrollo', cantidad: 1 }),
    );
    expect(desarrollo.preguntas[0].solucion_referencia).toBe('Se compone...');
  });

  it('no devuelve más preguntas que las solicitadas', async () => {
    const { proveedor } = crearProveedor(
      respuestaCon([
        PREGUNTA_UNICA_VALIDA,
        PREGUNTA_UNICA_VALIDA,
        PREGUNTA_UNICA_VALIDA,
      ]),
    );

    const resultado = await proveedor.generarPreguntas(
      crearSolicitud({ cantidad: 1 }),
    );

    expect(resultado.preguntas).toHaveLength(1);
  });

  it('detecta el límite de tokens de salida', async () => {
    const { proveedor } = crearProveedor({
      texto: '{"preguntas":[{"enunciado":"incompleto"',
      motivoFinalizacion: 'MAX_TOKENS',
      bloqueo: null,
      tokens: { entrada: 10, salida: 8192, total: 8202 },
    });

    await expect(proveedor.generarPreguntas(crearSolicitud())).rejects.toMatchObject(
      { motivo: 'respuesta_invalida' },
    );
  });

  it('informa cuando el proveedor no devuelve contenido', async () => {
    const { proveedor } = crearProveedor({
      texto: null,
      motivoFinalizacion: 'SAFETY',
      bloqueo: 'SAFETY',
      tokens: { entrada: 10, salida: 0, total: 10 },
    });

    await expect(proveedor.generarPreguntas(crearSolicitud())).rejects.toThrow(
      /bloqueó la respuesta/i,
    );
  });

  it('mapea el error 429 a cuota y lo marca como reintentable', async () => {
    const error = Object.assign(new Error('rate limit'), { status: 429 });
    const { proveedor } = crearProveedor(error);

    await expect(
      proveedor.generarPreguntas(crearSolicitud()),
    ).rejects.toMatchObject({
      motivo: 'cuota',
      estadoHttp: 429,
      reintentable: true,
    });
  });

  it('mapea los errores de autenticación', async () => {
    const error = Object.assign(new Error('unauthorized'), { status: 401 });
    const { proveedor } = crearProveedor(error);

    await expect(
      proveedor.generarPreguntas(crearSolicitud()),
    ).rejects.toMatchObject({ motivo: 'autenticacion', reintentable: false });
  });

  it('identifica un modelo Gemini inexistente o no disponible', async () => {
    const error = Object.assign(new Error('not found'), { status: 404 });
    const { proveedor } = crearProveedor(error);

    await expect(
      proveedor.generarPreguntas(crearSolicitud()),
    ).rejects.toMatchObject({
      motivo: 'modelo_no_disponible',
      reintentable: false,
    });
  });

  it('mapea los errores del proveedor y oculta credenciales del mensaje', async () => {
    const error = Object.assign(
      new Error(
        `fallo con la clave AIzaSyClaveSecretaDePrueba123456 y el material ${MATERIAL_SENSIBLE}`,
      ),
      { status: 400 },
    );
    const { proveedor } = crearProveedor(error, crearConfig());

    const capturado = await proveedor
      .generarPreguntas(crearSolicitud())
      .catch((fallo: unknown) => fallo);

    expect(capturado).toBeInstanceOf(ErrorGeneracionIa);
    const fallo = capturado as ErrorGeneracionIa;

    expect(fallo.motivo).toBe('proveedor');
    expect(fallo.estadoHttp).toBe(400);
    expect(fallo.reintentable).toBe(false);
    expect(fallo.message).toContain('[clave-oculta]');
    expect(fallo.message).not.toContain('AIzaSyClaveSecretaDePrueba123456');
  });

  it('marca los errores 5xx como reintentables', async () => {
    const error = Object.assign(new Error('unavailable'), { status: 503 });
    const { proveedor } = crearProveedor(error);

    await expect(
      proveedor.generarPreguntas(crearSolicitud()),
    ).rejects.toMatchObject({ motivo: 'proveedor', reintentable: true });
  });

  it('cancela la petición y mapea el timeout real por AbortSignal', async () => {
    const config = crearConfig({ GEMINI_TIMEOUT_MS: '20' });
    const cliente = new ClienteFalso(
      (peticion) =>
        new Promise<RespuestaGemini>((_, rechazar) => {
          peticion.senalAborto.addEventListener('abort', () => {
            rechazar(
              Object.assign(new Error('This operation was aborted'), {
                name: 'AbortError',
              }),
            );
          });
        }),
    );
    const proveedor = new GeminiAiProvider({ config, cliente });

    await expect(
      proveedor.generarPreguntas(crearSolicitud()),
    ).rejects.toMatchObject({ motivo: 'timeout', reintentable: true });

    expect(cliente.peticiones[0].senalAborto.aborted).toBe(true);
  });

  it('exige GEMINI_MODEL antes de llamar al proveedor', async () => {
    const config: IaConfig = { ...crearConfig(), modelo: null };
    const { proveedor, cliente } = crearProveedor(
      respuestaCon([PREGUNTA_UNICA_VALIDA]),
      config,
    );

    await expect(
      proveedor.generarPreguntas(crearSolicitud()),
    ).rejects.toBeInstanceOf(ErrorConfiguracionIa);
    expect(cliente.peticiones).toHaveLength(0);
  });
});
