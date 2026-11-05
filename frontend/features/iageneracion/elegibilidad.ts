import type { Material } from '../materiales/types';

/**
 * Material que el backend aceptaría como contexto de una generación.
 *
 * Debe estar activo, autorizado para IA y tener texto extraído. La autorización
 * es explícita: `disponible_para_ia` del backend no sustituye a
 * `autorizado_ia` para decidir si se puede seleccionar.
 */
export function esMaterialSeleccionableParaIa(
    material: Material,
): boolean {
    return (
        material.activo &&
        material.autorizado_ia &&
        material.estado_extraccion.estado === 'completado' &&
        material.estado_extraccion.caracteres > 0
    );
}
