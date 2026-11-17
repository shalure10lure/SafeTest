import 'dotenv/config';

import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { DataSource } from 'typeorm';

// Carpeta donde se encuentran las migraciones.
const carpetaMigraciones = join(__dirname, 'migrations');

// Extensión según el entorno:
// TypeScript durante desarrollo, JavaScript al compilar.
const extension = __filename.endsWith('.ts') ? '.ts' : '.js';

// Solo se cargan migraciones reales, no archivos de pruebas.
const migraciones = readdirSync(carpetaMigraciones)
    .filter(
        (archivo) =>
            archivo.endsWith(extension) &&
            !archivo.endsWith(`.spec${extension}`) &&
            !archivo.endsWith(`.test${extension}`) &&
            !archivo.endsWith(`.d${extension}`),
    )
    .map((archivo) =>
        join(carpetaMigraciones, archivo).replace(/\\/g, '/'),
    );

export default new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    entities: ['src/**/*.entity.ts'],
    migrations: migraciones,
});