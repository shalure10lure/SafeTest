import {
  mensajeBloqueoEliminacion,
  normalizarMaterias,
  normalizarNombresParalelos,
} from './gestion-academica.utils';

describe('normalizarMaterias', () => {
  it('limpia espacios y pone el código en mayúsculas', () => {
    const { materias, errores } = normalizarMaterias(
      [{ nombre: '  Cálculo I ', codigo: ' mat101 ', descripcion: ' ' }],
      [],
    );

    expect(errores).toEqual([]);
    expect(materias[0]).toEqual({
      nombre: 'Cálculo I',
      codigo: 'MAT101',
      descripcion: null,
    });
  });

  it('marca nombre y código vacíos en su fila', () => {
    const { errores } = normalizarMaterias(
      [{ nombre: '', codigo: '' }],
      [],
    );

    expect(errores.map((e) => e.campo)).toEqual(['nombre', 'codigo']);
    expect(errores.every((e) => e.indice === 0)).toBe(true);
  });

  it('detecta códigos repetidos dentro de la lista', () => {
    const { errores } = normalizarMaterias(
      [
        { nombre: 'A', codigo: 'x1' },
        { nombre: 'B', codigo: 'X1' },
      ],
      [],
    );

    expect(errores).toHaveLength(1);
    expect(errores[0].indice).toBe(1);
    expect(errores[0].mensaje).toContain('fila 1');
  });

  it('detecta códigos que ya existen en la cuenta del docente', () => {
    const { errores } = normalizarMaterias(
      [{ nombre: 'Física', codigo: 'fis100' }],
      ['FIS100'],
    );

    expect(errores).toHaveLength(1);
    expect(errores[0].mensaje).toContain('FIS100');
  });
});

describe('normalizarNombresParalelos', () => {
  it('ignora vacíos y quita espacios', () => {
    const { nombres, errores } = normalizarNombresParalelos([
      ' Paralelo A ',
      '',
      '   ',
      'Paralelo B',
    ]);

    expect(nombres).toEqual(['Paralelo A', 'Paralelo B']);
    expect(errores).toEqual([]);
  });

  it('avisa de nombres repetidos sin distinguir mayúsculas', () => {
    const { nombres, errores } = normalizarNombresParalelos(['A', 'a']);

    expect(nombres).toEqual(['A']);
    expect(errores).toHaveLength(1);
  });
});

describe('mensajeBloqueoEliminacion', () => {
  it('devuelve null si no hay datos que dependan', () => {
    expect(
      mensajeBloqueoEliminacion('materia', { paralelos: 0, evaluaciones: 0 }),
    ).toBeNull();
  });

  it('explica qué datos lo impiden y qué hacer', () => {
    const mensaje = mensajeBloqueoEliminacion('periodo', {
      paralelos: 2,
      evaluaciones: 1,
    });

    expect(mensaje).toContain('el periodo');
    expect(mensaje).toContain('2 paralelos y 1 evaluación');
    expect(mensaje).toContain('desactivado');
  });

  it('usa el género correcto para materia', () => {
    const mensaje = mensajeBloqueoEliminacion('materia', { temas: 3 });

    expect(mensaje).toContain('la materia');
    expect(mensaje).toContain('3 temas');
    expect(mensaje).toContain('desactivada');
  });
});
