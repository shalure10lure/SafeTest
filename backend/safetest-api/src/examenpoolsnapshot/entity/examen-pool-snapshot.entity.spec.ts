import 'reflect-metadata';

import { getMetadataArgsStorage } from 'typeorm';

import { Examen } from '../../examen/entity/examen.entity';
import { ExamenTema } from '../../examentema/entity/examentema.entity';
import { Inciso } from '../../inciso/entity/inciso.entity';
import { Pregunta } from '../../pregunta/entity/pregunta.entity';
import { ExamenPoolSnapshot } from './examen-pool-snapshot.entity';
import { ExamenPoolSnapshotInciso } from './examen-pool-snapshot-inciso.entity';
import { ExamenPoolSnapshotPregunta } from './examen-pool-snapshot-pregunta.entity';
import { ExamenPoolSnapshotTema } from './examen-pool-snapshot-tema.entity';

const storage = getMetadataArgsStorage();

function columnasPorPropiedad(entity: Function) {
  return new Map(
    storage
      .filterColumns(entity)
      .map((columna) => [columna.propertyName, columna]),
  );
}

function columnasPrimarias(entity: Function) {
  return storage
    .filterColumns(entity)
    .filter((columna) => columna.options.primary)
    .map((columna) => columna.options.name ?? columna.propertyName)
    .sort();
}

function destinoRelacion(entity: Function, propertyName: string) {
  const relacion = storage
    .filterRelations(entity)
    .find((item) => item.propertyName === propertyName);

  return typeof relacion?.type === 'function'
    ? (relacion.type as () => unknown)()
    : relacion?.type;
}

describe('entidades de instantánea del pool', () => {
  it('mapea las cuatro tablas y sus claves primarias', () => {
    expect(storage.filterTables(ExamenPoolSnapshot)[0]?.name).toBe(
      'examen_pool_snapshot',
    );
    expect(storage.filterTables(ExamenPoolSnapshotTema)[0]?.name).toBe(
      'examen_pool_snapshot_tema',
    );
    expect(storage.filterTables(ExamenPoolSnapshotPregunta)[0]?.name).toBe(
      'examen_pool_snapshot_pregunta',
    );
    expect(storage.filterTables(ExamenPoolSnapshotInciso)[0]?.name).toBe(
      'examen_pool_snapshot_inciso',
    );

    expect(columnasPrimarias(ExamenPoolSnapshot)).toEqual(['examen_id']);
    expect(columnasPrimarias(ExamenPoolSnapshotTema)).toEqual([
      'examen_id',
      'tema_id',
    ]);
    expect(columnasPrimarias(ExamenPoolSnapshotPregunta)).toEqual([
      'examen_id',
      'pregunta_id',
      'tema_id',
    ]);
    expect(columnasPrimarias(ExamenPoolSnapshotInciso)).toEqual([
      'examen_id',
      'letra',
      'pregunta_id',
      'tema_id',
    ]);
  });

  it('persiste todos los puntajes como numeric', () => {
    const puntajes = [
      [ExamenPoolSnapshot, 'puntaje_maximo_garantizado'],
      [ExamenPoolSnapshotTema, 'puntaje_maximo_tema'],
      [ExamenPoolSnapshotPregunta, 'puntaje_maximo_pregunta'],
      [ExamenPoolSnapshotInciso, 'puntaje_max'],
    ] as const;

    for (const [entity, property] of puntajes) {
      expect(columnasPorPropiedad(entity).get(property)?.options.type).toBe(
        'numeric',
      );
    }

    expect(
      columnasPorPropiedad(ExamenPoolSnapshot)
        .get('puntaje_maximo_garantizado')
        ?.options.nullable,
    ).not.toBe(true);
    expect(columnasPorPropiedad(ExamenPoolSnapshot).get('creado_en')?.options)
      .toMatchObject({
        name: 'creado_en',
        type: 'timestamptz',
      });
  });

  it('declara checks positivos y cantidades consistentes', () => {
    const checksSnapshot = storage.filterChecks(ExamenPoolSnapshot);
    const checksTema = storage.filterChecks(ExamenPoolSnapshotTema);

    expect(checksSnapshot.map((check) => check.name).sort()).toEqual([
      'CHK_examen_pool_snapshot_puntaje',
      'CHK_examen_pool_snapshot_version',
    ]);
    expect(columnasPorPropiedad(ExamenPoolSnapshot).get('version')?.options)
      .toMatchObject({
        type: 'int',
        default: 1,
      });
    expect(checksTema.map((check) => check.name).sort()).toEqual([
      'CHK_epst_cantidad',
      'CHK_epst_cantidad_candidatas',
      'CHK_epst_cantidad_seleccionada',
      'CHK_epst_puntaje',
    ]);
    expect(
      checksTema.find((check) => check.name === 'CHK_epst_cantidad')?.expression,
    ).toContain('"cantidad_seleccionada" <= "cantidad_candidatas"');
    expect(
      storage
        .filterChecks(ExamenPoolSnapshotPregunta)
        .find((check) => check.name === 'CHK_epsp_puntaje')?.expression,
    ).toContain('"puntaje_maximo_pregunta" > 0');
    expect(
      storage
        .filterChecks(ExamenPoolSnapshotInciso)
        .find((check) => check.name === 'CHK_epsi_puntaje')?.expression,
    ).toContain('"puntaje_max" > 0');
  });

  it('declara unicidad del examen y de cada pregunta candidata', () => {
    expect(
      storage
        .filterUniques(ExamenPoolSnapshotPregunta)
        .find((unique) => unique.name === 'UQ_epsp_examen_pregunta')?.columns,
    ).toEqual(['examen_id', 'pregunta_id']);
  });

  it('vincula snapshot, configuración, pregunta e inciso por sus claves reales', () => {
    expect(destinoRelacion(ExamenPoolSnapshot, 'examen')).toBe(Examen);
    expect(destinoRelacion(ExamenPoolSnapshotTema, 'snapshot')).toBe(
      ExamenPoolSnapshot,
    );
    expect(destinoRelacion(ExamenPoolSnapshotTema, 'examenTema')).toBe(
      ExamenTema,
    );
    expect(destinoRelacion(ExamenPoolSnapshotPregunta, 'pregunta')).toBe(
      Pregunta,
    );
    expect(destinoRelacion(ExamenPoolSnapshotInciso, 'inciso')).toBe(Inciso);

    expect(
      storage
        .filterJoinColumns(ExamenPoolSnapshotTema, 'examenTema')
        .map((joinColumn) => [
          joinColumn.name,
          joinColumn.referencedColumnName,
        ]),
    ).toEqual([
      ['examen_id', 'examen_id'],
      ['tema_id', 'tema_id'],
    ]);
    expect(
      storage
        .filterJoinColumns(ExamenPoolSnapshotPregunta, 'pregunta')
        .map((joinColumn) => [
          joinColumn.name,
          joinColumn.referencedColumnName,
        ]),
    ).toEqual([
      ['pregunta_id', 'pregunta_id'],
      ['tema_id', 'tema_id'],
    ]);
    expect(
      storage
        .filterJoinColumns(ExamenPoolSnapshotInciso, 'inciso')
        .map((joinColumn) => [
          joinColumn.name,
          joinColumn.referencedColumnName,
        ]),
    ).toEqual([
      ['pregunta_id', 'pregunta_id'],
      ['letra', 'letra'],
    ]);
  });

  it('declara la clave única compuesta necesaria para la FK pregunta-tema', () => {
    const index = storage
      .filterIndices(Pregunta)
      .find((item) => item.name === 'UQ_pregunta_pregunta_tema');

    expect(index?.unique).toBe(true);
    expect(index?.columns).toEqual(['pregunta_id', 'tema_id']);
  });
});
