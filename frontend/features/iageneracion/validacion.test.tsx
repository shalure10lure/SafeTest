import { describe, expect, it } from 'vitest';

import type { Material } from '../materiales/types';
import {
    construirDtoIa,
    validarFormularioIa,
    type DatosFormularioIa,
} from './validacion';

const materialAutorizado: Material = {
    material_id: 8,
    titulo: 'Unidad de fotosíntesis',
    materia_id: 1,
    materia: 'Biología',
    tema_id: 2,
    tema: 'Fotosíntesis',
    nombre_archivo: 'unidad.pdf',
    mime_type: 'application/pdf',
    tamano_bytes: 1024,
    activo: true,
    autorizado_ia: true,
    autorizado_en: '2026-01-01T00:00:00.000Z',
    fecha_subida: '2026-01-01T00:00:00.000Z',
    estado_extraccion: { estado: 'completado', caracteres: 1200 },
};

function crearDatos(
    sobrescribir: Partial<DatosFormularioIa> = {},
): DatosFormularioIa {
    return {
        materiaId: '1',
        temaId: '2',
        tipo: 'opcion_unica',
        cantidad: '2',
        dificultad: 'media',
        materialIds: [8],
        temasDeMateria: [
            { tema_id: 2, nombre_tema: 'Fotosíntesis', materia_id: 1 },
        ],
        materialesSeleccionables: [materialAutorizado],
        ...sobrescribir,
    };
}

describe('validación del formulario de generación IA', () => {
    it('requiere al menos un material documental autorizado y extraído', () => {
        const resultado = validarFormularioIa(
            crearDatos({ materialIds: [], materialesSeleccionables: [] }),
        );

        expect(resultado.errores.materiales).toContain(
            'al menos un material autorizado',
        );
        expect(resultado.hayErrores).toBe(true);
    });

    it('rechaza ids que no aparecen entre los materiales seleccionables', () => {
        const resultado = validarFormularioIa(
            crearDatos({ materialIds: [99] }),
        );

        expect(resultado.errores.materiales).toContain(
            'Solo puedes usar materiales activos',
        );
    });

    it('envía los ids elegidos en el DTO de generación', () => {
        const dto = construirDtoIa(crearDatos());

        expect(dto.material_ids).toEqual([8]);
        expect(dto.tipo_respuesta).toBe('opcion_unica');
    });
});
