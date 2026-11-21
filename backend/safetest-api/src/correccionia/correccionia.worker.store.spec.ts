import { jest } from '@jest/globals';
import type { DataSource } from 'typeorm';

import { CorreccionIaWorkerStore } from './correccionia.worker.store';

describe('CorreccionIaWorkerStore', () => {
  it('reclama una fila con una sentencia SKIP LOCKED sin cambiar el intento funcional', async () => {
    const query = jest.fn(async (_sql: string, _parametros?: unknown[]) => [
      { propuesta_id: 73 },
    ]);
    const store = new CorreccionIaWorkerStore({
      query,
    } as unknown as DataSource);

    await expect(
      store.reclamar(new Date('2026-01-01T00:00:00.000Z')),
    ).resolves.toBe(73);

    expect(query).toHaveBeenCalledTimes(1);
    const [sql, parametros] = query.mock.calls[0];
    expect(sql).toContain('FOR UPDATE OF p SKIP LOCKED');
    expect(sql).toContain("p.estado = 'pendiente'");
    expect(sql).toContain('e.calificaciones_revisadas_en IS NULL');
    expect(sql).toContain('e.resultados_publicados_en IS NULL');
    expect(sql).toContain('reintentos_worker = c.reintentos_worker + 1');
    expect(sql).not.toMatch(/intento\s*=/i);
    expect(parametros).toEqual([new Date('2026-01-01T00:00:00.000Z')]);
  });

  it('recupera lease vencido separando propuestas reencoladas, agotadas y cerradas', async () => {
    const query = jest
      .fn(
        async (
          _sql: string,
          _parametros?: unknown[],
        ): Promise<Array<{ propuesta_id: number }>> => [],
      )
      .mockResolvedValueOnce([{ propuesta_id: 1 }])
      .mockResolvedValueOnce([{ propuesta_id: 2 }, { propuesta_id: 3 }])
      .mockResolvedValueOnce([{ propuesta_id: 4 }]);
    const store = new CorreccionIaWorkerStore({
      query,
    } as unknown as DataSource);
    const ahora = new Date('2026-01-01T00:00:00.000Z');

    await expect(store.recuperarAbandonadas(ahora, 120, 3)).resolves.toEqual({
      cerradas: 1,
      reencoladas: 2,
      agotadas: 1,
    });

    expect(query).toHaveBeenCalledTimes(3);
    const consultas = query.mock.calls.map(([sql]) => sql);
    expect(consultas[0]).toContain("error_codigo = 'EXAMEN_PUBLICADO'");
    expect(consultas[1]).toContain('c.reintentos_worker < $3');
    expect(consultas[1]).toContain("estado = 'pendiente'");
    expect(consultas[2]).toContain('c.reintentos_worker >= $3');
    expect(consultas[2]).toContain("error_codigo = 'TIEMPO_AGOTADO'");
    expect(query.mock.calls[0][1]).toEqual([ahora, 120, expect.any(String)]);
    expect(query.mock.calls[1][1]).toEqual([ahora, 120, 3]);
    expect(query.mock.calls[2][1]).toEqual([ahora, 120, 3, expect.any(String)]);
  });
});
