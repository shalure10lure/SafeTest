import { describe, expect, it } from 'vitest';

import { construirDto, validarFormulario } from './validacion';
import type { DatosFormularioPregunta } from './validacion';

function datosFormulario(
    sobrescribir: Partial<DatosFormularioPregunta> = {},
): DatosFormularioPregunta {
    return {
        materiaId: '1',
        temaId: '1',
        temasDeMateria: [{ tema_id: 1 }],
        tipo: 'desarrollo',
        puntaje: '2.5',
        enunciado: 'Explica el teorema de Pitágoras.',
        opciones: [],
        respuestaBooleana: '',
        valorCorrecto: '',
        tolerancia: '0',
        solucionReferencia: 'a² + b² = c²',
        ...sobrescribir,
    };
}

describe('construirDto — contrato de puntaje con el backend', () => {
    it('envía el puntaje del inciso en el campo puntaje_max', () => {
        const datos = datosFormulario();
        const validacion = validarFormulario(datos);

        const dto = construirDto(datos, validacion.puntajeNumero);

        expect(dto.puntaje_max).toBe(2.5);
        expect(dto).not.toHaveProperty('puntos');
    });
});
