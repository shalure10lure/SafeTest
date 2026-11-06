import type {
  DificultadIa,
  SolicitudGeneracionIa,
} from '../ai.types';
import { FakeAiProvider } from './fake-ai.provider';

function solicitud(
  dificultad: DificultadIa,
  sobrescribir: Partial<SolicitudGeneracionIa> = {},
): SolicitudGeneracionIa {
  return {
    materia: 'Biología',
    tema: 'Fotosíntesis',
    tipo_respuesta: 'opcion_unica',
    cantidad: 1,
    dificultad,
    materiales: [],
    ...sobrescribir,
  };
}

describe('FakeAiProvider', () => {
  const proveedor = new FakeAiProvider({ modelo: 'fake-test' });

  it('diferencia el tipo de tarea según la dificultad, no solo la etiqueta', async () => {
    const facil = await proveedor.generarPreguntas(solicitud('facil'));
    const media = await proveedor.generarPreguntas(solicitud('media'));
    const dificil = await proveedor.generarPreguntas(solicitud('dificil'));

    expect(facil.preguntas[0].enunciado).toContain('define un concepto básico');
    expect(media.preguntas[0].enunciado).toContain('aplica lo aprendido');
    expect(dificil.preguntas[0].enunciado).toContain('varios pasos de razonamiento');
    expect(facil.preguntas[0].enunciado).not.toBe(
      media.preguntas[0].enunciado,
    );
    expect(media.preguntas[0].enunciado).not.toBe(
      dificil.preguntas[0].enunciado,
    );
  });

  it('conserva la dificultad solicitada en cada propuesta', async () => {
    for (const dificultad of ['facil', 'media', 'dificil'] as const) {
      const resultado = await proveedor.generarPreguntas(
        solicitud(dificultad, { cantidad: 2 }),
      );

      expect(resultado.preguntas).toHaveLength(2);
      expect(
        resultado.preguntas.every(
          (pregunta) => pregunta.dificultad === dificultad,
        ),
      ).toBe(true);
    }
  });

  it('es determinista para la misma solicitud', async () => {
    const primera = await proveedor.generarPreguntas(solicitud('dificil'));
    const segunda = await proveedor.generarPreguntas(solicitud('dificil'));

    expect(segunda).toEqual(primera);
  });

  it('aclara que solo sirve para probar el flujo', async () => {
    const resultado = await proveedor.generarPreguntas(solicitud('dificil'));

    expect(resultado.preguntas[0].explicacion).toContain(
      'El proveedor fake solo prueba el flujo',
    );
    expect(resultado.preguntas[0].explicacion).toContain(
      'no la calidad pedagógica real',
    );
  });

  it('genera propuestas válidas para todos los tipos con cualquier dificultad', async () => {
    const tipos = [
      'opcion_unica',
      'opcion_multiple',
      'verdadero_falso',
      'numerica',
      'desarrollo',
    ] as const;

    for (const dificultad of ['facil', 'media', 'dificil'] as const) {
      for (const tipo of tipos) {
        const resultado = await proveedor.generarPreguntas(
          solicitud(dificultad, { tipo_respuesta: tipo }),
        );

        expect(resultado.preguntas[0].tipo_respuesta).toBe(tipo);
        expect(resultado.preguntas[0].dificultad).toBe(dificultad);
      }
    }
  });
});
