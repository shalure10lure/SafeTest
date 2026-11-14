import 'reflect-metadata';

import { getMetadataArgsStorage } from 'typeorm';

import { Docente } from '../../docente/entity/docente.entity';
import { TIPOS_RESPUESTA } from '../../pregunta/entity/dtos/create-pregunta.dto';
import { ReglaCorreccion } from './reglacorreccion.entity';

const storage = getMetadataArgsStorage();

function columnasPorPropiedad() {
  return new Map(
    storage
      .filterColumns(ReglaCorreccion)
      .map((columna) => [columna.propertyName, columna]),
  );
}

describe('ReglaCorreccion', () => {
  it('mapea la tabla regla_correccion', () => {
    const tabla = storage.filterTables(ReglaCorreccion)[0];

    expect(tabla).toBeDefined();
    expect(tabla?.name).toBe('regla_correccion');
  });

  it('declara únicamente las columnas propias de una regla', () => {
    const columnas = columnasPorPropiedad();

    expect([...columnas.keys()].sort()).toEqual([
      'activo',
      'actualizado_en',
      'creado_en',
      'docente_id',
      'parametros',
      'regla_id',
      'tipo_respuesta',
    ]);

    // Los valores de corrección no se duplican aquí.
    expect(columnas.has('valor_correcto')).toBe(false);
    expect(columnas.has('tolerancia')).toBe(false);
    expect(columnas.has('rubrica')).toBe(false);
    expect(columnas.has('solucion_referencia')).toBe(false);
  });

  it('define los tipos y restricciones básicas de las columnas', () => {
    const columnas = columnasPorPropiedad();

    expect(columnas.get('regla_id')?.options.name).toBe('regla_id');
    expect(columnas.get('regla_id')?.options.primary).toBe(true);

    expect(columnas.get('docente_id')?.options).toMatchObject({
      name: 'docente_id',
      type: 'int',
    });
    expect(columnas.get('docente_id')?.options.nullable).not.toBe(true);

    expect(columnas.get('tipo_respuesta')?.options).toMatchObject({
      name: 'tipo_respuesta',
      type: 'varchar',
      length: 30,
    });
    expect(columnas.get('tipo_respuesta')?.options.nullable).not.toBe(true);

    expect(columnas.get('parametros')?.options.type).toBe('jsonb');
    expect(columnas.get('parametros')?.options.nullable).not.toBe(true);

    expect(columnas.get('activo')?.options).toMatchObject({
      type: 'boolean',
      default: true,
    });

    expect(columnas.get('creado_en')?.options.name).toBe('creado_en');
    expect(columnas.get('actualizado_en')?.options.name).toBe('actualizado_en');
  });

  it('limita tipo_respuesta exactamente a TIPOS_RESPUESTA', () => {
    const check = storage
      .filterChecks(ReglaCorreccion)
      .find((c) => c.name === 'CHK_regla_correccion_tipo');

    expect(check).toBeDefined();

    const tiposEnSql = [...(check?.expression.match(/'([a-z_]+)'/g) ?? [])].map(
      (valor) => valor.replace(/'/g, ''),
    );

    expect(tiposEnSql.sort()).toEqual([...TIPOS_RESPUESTA].sort());
    expect(check?.expression).not.toContain('texto_corto');
    expect(check?.expression).not.toContain('mixto');
  });

  it('exige que parametros sea un objeto JSON', () => {
    const check = storage
      .filterChecks(ReglaCorreccion)
      .find((c) => c.name === 'CHK_regla_correccion_parametros');

    expect(check?.expression.replace(/\s+/g, ' ')).toContain(
      `jsonb_typeof("parametros") = 'object'`,
    );
  });

  it('garantiza una sola regla por docente y tipo de respuesta', () => {
    const unique = storage
      .filterUniques(ReglaCorreccion)
      .find((u) => u.name === 'UQ_regla_correccion_docente_tipo');

    expect(unique?.columns).toEqual(['docente_id', 'tipo_respuesta']);
  });

  it('indexa la búsqueda por docente y estado activo', () => {
    const index = storage
      .filterIndices(ReglaCorreccion)
      .find((i) => i.name === 'IDX_regla_correccion_docente_activo');

    expect(index?.columns).toEqual(['docente_id', 'activo']);
  });

  it('se relaciona con el docente mediante una FK en cascada', () => {
    const relacion = storage
      .filterRelations(ReglaCorreccion)
      .find((r) => r.propertyName === 'docente');

    expect(relacion?.relationType).toBe('many-to-one');
    expect(relacion?.options.nullable).toBe(false);
    expect(relacion?.options.onDelete).toBe('CASCADE');

    // TypeORM acepta la entidad destino como clase o como función que la
    // devuelve; aquí se resuelve el valor real antes de compararlo.
    const tipoDeRelacion =
      typeof relacion?.type === 'function'
        ? (relacion.type as () => unknown)()
        : relacion?.type;

    expect(tipoDeRelacion).toBe(Docente);

    const joinColumn = storage.filterJoinColumns(ReglaCorreccion, 'docente')[0];

    expect(joinColumn?.name).toBe('docente_id');
    expect(joinColumn?.foreignKeyConstraintName).toBe(
      'FK_regla_correccion_docente',
    );
  });
});
