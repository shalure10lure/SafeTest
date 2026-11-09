import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  AlmacenImagenesPregunta,
  claveParaImagen,
  ErrorAlmacenImagenes,
} from './almacen-imagenes-pregunta';

describe('AlmacenImagenesPregunta', () => {
  let directorio: string;
  let almacen: AlmacenImagenesPregunta;

  beforeAll(async () => {
    directorio = await mkdtemp(join(tmpdir(), 'safetest-preguntas-'));
  });

  afterAll(async () => {
    await rm(directorio, { recursive: true, force: true });
  });

  beforeEach(() => {
    almacen = new AlmacenImagenesPregunta({
      maxBytesImagen: 1024,
      directorioAlmacen: directorio,
    });
  });

  it('genera claves con docente, UUID y extensión', () => {
    expect(claveParaImagen(7, 'png')).toMatch(
      /^preguntas\/7\/[0-9a-f-]{36}\.png$/,
    );
  });

  it('guarda, lee y elimina una imagen', async () => {
    const clave = 'preguntas/7/00000000-0000-4000-8000-000000000001.png';
    const contenido = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

    await almacen.guardar(clave, contenido);
    await expect(readFile(join(directorio, clave))).resolves.toEqual(contenido);
    await expect(almacen.leer(clave)).resolves.toEqual(contenido);

    await almacen.eliminar(clave);
    await expect(almacen.leer(clave)).rejects.toBeInstanceOf(
      ErrorAlmacenImagenes,
    );
  });

  it('tolera eliminar una imagen que ya no existe', async () => {
    await expect(
      almacen.eliminar('preguntas/7/00000000-0000-4000-8000-000000000002.png'),
    ).resolves.toBeUndefined();
  });

  it('rechaza claves con path traversal o fuera del patrón', async () => {
    const invalidas = [
      '../fuera.png',
      'preguntas/7/../../fuera.png',
      'preguntas/7/..',
      'preguntas\\7\\archivo.png',
      '/etc/passwd',
      'materiales/7/archivo.png',
      'preguntas/7/archivo con espacios.png',
    ];

    for (const clave of invalidas) {
      await expect(almacen.guardar(clave, Buffer.from('x'))).rejects.toBeInstanceOf(
        ErrorAlmacenImagenes,
      );
      await expect(almacen.leer(clave)).rejects.toBeInstanceOf(
        ErrorAlmacenImagenes,
      );
      await expect(almacen.eliminar(clave)).rejects.toBeInstanceOf(
        ErrorAlmacenImagenes,
      );
    }
  });
});