import type { EstadoExtraccionDetalle, Material } from './types';

/**
 * Un material puede autorizarse para IA si está activo y tiene texto extraído.
 *
 * No se usa `disponible_para_ia` para esta decisión: el backend solo marca esa
 * bandera cuando el material ya está autorizado, por lo que utilizarla aquí
 * impediría autorizar cualquier material por primera vez.
 */
export function puedeAutorizarParaIa(
    material: Material,
    extraccion: EstadoExtraccionDetalle | null,
): boolean {
    const estado = extraccion?.estado ?? material.estado_extraccion.estado;
    const caracteres =
        extraccion?.caracteres ?? material.estado_extraccion.caracteres;

    return material.activo && estado === 'completado' && caracteres > 0;
}
