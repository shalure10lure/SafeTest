export function incisoRespondido(
  tipo: string,
  texto: string | null,
  opcionesMarcadas: number,
): boolean {
  const respuesta = texto?.trim() ?? '';
  switch (tipo) {
    case 'opcion_unica':
    case 'verdadero_falso':
      return opcionesMarcadas === 1;
    case 'opcion_multiple':
      return opcionesMarcadas > 0;
    case 'desarrollo':
    case 'texto_corto':
      return respuesta.length > 0;
    case 'numerica':
      return (
        respuesta.length > 0 &&
        /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(respuesta) &&
        Number.isFinite(Number(respuesta))
      );
    default:
      return false;
  }
}
