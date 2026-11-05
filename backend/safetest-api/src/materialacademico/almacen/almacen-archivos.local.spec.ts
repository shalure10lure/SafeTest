import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { ErrorAlmacenArchivos, type AlmacenArchivos } from './almacen-archivos';
import { AlmacenArchivosLocal } from './almacen-archivos.local';

describe('AlmacenArchivosLocal', () => {
  let directorio: string;
  let almacen: AlmacenArchivos;

  beforeAll(async () => {
    directorio = await mkdtemp(join(tmpdir(), 'safetest-materiales-'));
  });

  afterAll(async () => {
    await rm(directorio, { recursive: true, force: true });
  });

  beforeEach(() => {
    almacen = new AlmacenArchivosLocal({
      maxBytes: 1024,
      directorioAlmacen: directorio,
    });
  });

  it('guarda el archivo con la clave indicada y crea el subdirectorio', async () => {
    const clave = 'materiales/7/00000000-0000-4000-8000-000000000001.pdf';
    const contenido = Buffer.from('%PDF-1.4 contenido');

    await almacen.guardar(clave, contenido, 'application/pdf');

    await expect(readFile(join(directorio, clave))).resolves.toEqual(contenido);
  });

  it('elimina el archivo y tolera que ya no exista', async () => {
    const clave = 'materiales/7/00000000-0000-4000-8000-000000000002.txt';

    await almacen.guardar(clave, Buffer.from('hola'), 'text/plain');
    await almacen.eliminar(clave);
    await expect(almacen.eliminar(clave)).resolves.toBeUndefined();
  });

  it('rechaza claves con path traversal o separadores de Windows', async () => {
    const invalidas = [
      '../fuera.txt',
      'materiales/7/../../fuera.pdf',
      'materiales\\7\\archivo.pdf',
      '/etc/passwd',
      'materiales/7/archivo con espacios.pdf',
    ];

    for (const clave of invalidas) {
      await expect(
        almacen.guardar(clave, Buffer.from('x'), 'text/plain'),
      ).rejects.toBeInstanceOf(ErrorAlmacenArchivos);
    }
  });

  it('no permite eliminar rutas fuera del directorio base', async () => {
    await expect(almacen.eliminar('../fuera.txt')).rejects.toBeInstanceOf(
      ErrorAlmacenArchivos,
    );
  });
});
