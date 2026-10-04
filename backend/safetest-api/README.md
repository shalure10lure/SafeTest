# SafeTest — Backend

Backend de **SafeTest**, desarrollado con **NestJS, TypeScript, TypeORM y PostgreSQL**.

Este proyecto contiene la API REST encargada de la lógica del sistema, acceso a datos, autenticación, gestión académica, evaluaciones, resultados y demás funcionalidades del backend.

---

## Tecnologías

* **Node.js**
* **NestJS**
* **TypeScript**
* **TypeORM**
* **PostgreSQL**
* **Docker**
* **Postman**

---

## Requisitos

Antes de comenzar, tener instalado:

* Node.js
* npm
* Docker Desktop
* Git
* Postman

Comprobar las instalaciones:

```powershell
node --version
npm --version
docker --version
docker compose version
```

---

# Instalación

## 1. Clonar el proyecto

Clonar el repositorio y entrar a la carpeta del backend:

```powershell
cd SafeTest\backend\safetest-api
```

## 2. Instalar dependencias

```powershell
npm install
```

---

# Configuración de variables de entorno

Crear un archivo:

```text
.env
```

en:

```text
backend/safetest-api/.env
```

Contenido:

```env
PORT=3001

DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=safetest
```

El archivo `.env` contiene información de configuración local y **no debe subirse al repositorio**.

---

# Base de datos

SafeTest utiliza **PostgreSQL** ejecutándose mediante Docker.

Desde la raíz del proyecto:

```powershell
cd C:\Users\HP\SafeTest
```

Levantar los servicios:

```powershell
docker compose up -d
```

Comprobar:

```powershell
docker compose ps
```

Debe aparecer PostgreSQL ejecutándose.

La configuración utilizada actualmente es:

```text
Host: localhost
Port: 5432
Database: safetest
User: postgres
Password: postgres
```

---

# Ejecutar el backend

Entrar al backend:

```powershell
cd C:\Users\HP\SafeTest\backend\safetest-api
```

Ejecutar en modo desarrollo:

```powershell
npm run start:dev
```

Si todo está correcto, debe aparecer:

```text
Found 0 errors. Watching for file changes.
Nest application successfully started
SafeTest API ejecutándose en http://localhost:3001
```

La API estará disponible en:

```text
http://localhost:3001
```

---

# Estructura del backend

Los módulos del backend se organizan de forma independiente.

Ejemplo:

```text
src/
├── app.controller.ts
├── app.module.ts
├── app.service.ts
├── main.ts
│
└── categoria/
    ├── categoria.controller.ts
    ├── categoria.module.ts
    ├── categoria.service.ts
    │
    └── entity/
        ├── categoria.entity.ts
        └── dtos/
            ├── CreateCategoria.dto.ts
            └── UpdateCategoria.dto.ts
```

Los módulos reales de SafeTest seguirán esta misma idea.

---

# Organización de un módulo

Cada módulo debe separar sus responsabilidades:

```text
Módulo
│
├── Controller
│      ↓
│   recibe las peticiones HTTP
│
├── Service
│      ↓
│   contiene la lógica
│
├── Entity
│      ↓
│   representa la tabla de PostgreSQL
│
├── DTO
│      ↓
│   define los datos que recibe la API
│
└── Module
       ↓
    conecta los componentes
```

---

# Ejemplo: módulo Categoria

`Categoria` se utiliza actualmente **solo como prueba del funcionamiento del backend**.

No representa necesariamente una entidad final de SafeTest.

Su objetivo es comprobar que funciona correctamente:

```text
Postman
   ↓
Controller
   ↓
Service
   ↓
TypeORM
   ↓
PostgreSQL
```

---

## Entity

Archivo:

```text
src/categoria/entity/categoria.entity.ts
```

```ts
import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('categorias')
export class Categoria {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  nombre: string;

  @Column({ length: 255, nullable: true })
  descripcion: string;
}
```

Esta entidad representa la tabla:

```text
categorias
├── id
├── nombre
└── descripcion
```

---

## Module

Archivo:

```text
src/categoria/categoria.module.ts
```

```ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Categoria } from './entity/categoria.entity';
import { CategoriaController } from './categoria.controller';
import { CategoriaService } from './categoria.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Categoria]),
  ],
  controllers: [CategoriaController],
  providers: [CategoriaService],
})
export class CategoriaModule {}
```

La siguiente línea:

```ts
TypeOrmModule.forFeature([Categoria])
```

permite utilizar el repositorio de `Categoria` dentro del módulo.

---

## Service

Archivo:

```text
src/categoria/categoria.service.ts
```

El Service se encarga de realizar las operaciones sobre la base de datos:

```text
findAll() → listar
findOne() → buscar
create()  → crear
update()  → modificar
delete()  → eliminar
```

Ejemplo:

```ts
@Injectable()
export class CategoriaService {
  constructor(
    @InjectRepository(Categoria)
    private categoriaRepository: Repository<Categoria>,
  ) {}

  async findAll() {
    return this.categoriaRepository.find();
  }

  async findOne(id: number) {
    const categoria = await this.categoriaRepository.findOneBy({ id });

    if (!categoria) {
      throw new NotFoundException('Categoría no encontrada');
    }

    return categoria;
  }

  async create(body: CreateCategoriaDto) {
    const categoria = this.categoriaRepository.create(body);

    return this.categoriaRepository.save(categoria);
  }

  async update(id: number, body: UpdateCategoriaDto) {
    const categoria = await this.findOne(id);

    Object.assign(categoria, body);

    return this.categoriaRepository.save(categoria);
  }

  async delete(id: number) {
    const categoria = await this.findOne(id);

    return this.categoriaRepository.remove(categoria);
  }
}
```

---

## Controller

Archivo:

```text
src/categoria/categoria.controller.ts
```

El Controller define las rutas que pueden utilizarse desde Postman:

```text
GET     /categorias
GET     /categorias/:id
POST    /categorias
PUT     /categorias/:id
DELETE  /categorias/:id
```

---

# Registrar un módulo

Crear los archivos del módulo no es suficiente.

El módulo debe registrarse en:

```text
src/app.module.ts
```

Por ejemplo:

```ts
import { CategoriaModule } from './categoria/categoria.module';
```

y dentro de `imports`:

```ts
imports: [
  // configuración de la aplicación

  CategoriaModule,
],
```

Si el módulo no está registrado, NestJS no podrá utilizar sus rutas.

---

# Prueba con Postman

Con el backend ejecutándose en:

```text
http://localhost:3001
```

se pueden probar las operaciones CRUD de `Categoria`.

### Crear

```http
POST http://localhost:3001/categorias
```

Body → `raw` → `JSON`:

```json
{
  "nombre": "Matemáticas",
  "descripcion": "Materia de prueba"
}
```

### Listar

```http
GET http://localhost:3001/categorias
```

### Buscar por ID

```http
GET http://localhost:3001/categorias/1
```

### Modificar

```http
PUT http://localhost:3001/categorias/1
```

Body:

```json
{
  "nombre": "Matemáticas Avanzadas",
  "descripcion": "Materia modificada"
}
```

### Eliminar

```http
DELETE http://localhost:3001/categorias/1
```

---

# Flujo para crear un módulo nuevo

Cuando se vaya a desarrollar una funcionalidad real de SafeTest, seguir este orden:

```text
1. Revisar la tabla correspondiente
        ↓
2. Crear Entity
        ↓
3. Crear DTO de creación
        ↓
4. Crear DTO de actualización
        ↓
5. Crear Module
        ↓
6. Crear Service
        ↓
7. Crear Controller
        ↓
8. Registrar el Module en AppModule
        ↓
9. Ejecutar el backend
        ↓
10. Probar los endpoints con Postman
```

---

# Reglas para trabajar en el backend

### Controller

Se encarga de recibir las peticiones HTTP.

No debe contener la lógica principal de negocio.

```text
Controller → recibe la petición
```

### Service

Contiene la lógica y trabaja con el repositorio.

```text
Service → procesa la petición
```

### Entity

Representa una tabla de la base de datos.

```text
Entity → representa los datos
```

### DTO

Define los datos que puede recibir una petición.

```text
DTO → controla los datos de entrada
```

### Module

Agrupa y conecta los componentes de una funcionalidad.

```text
Module → organiza la funcionalidad
```

---

# Flujo general del backend

```text
Cliente / Postman
       │
       ▼
 Controller
       │
       ▼
   Service
       │
       ▼
 TypeORM / Repository
       │
       ▼
 PostgreSQL
```

---

# Estado actual

Actualmente está comprobado:

```text
[✓] NestJS funcionando
[✓] TypeScript compilando
[✓] ConfigModule funcionando
[✓] Variables .env funcionando
[✓] TypeORM configurado
[✓] PostgreSQL funcionando con Docker
[✓] NestJS conectado a PostgreSQL
[✓] CRUD de prueba funcionando
[✓] Pruebas con Postman
```

`Categoria` se mantiene como **módulo de prueba** para verificar el funcionamiento del backend.

Los módulos reales de SafeTest se desarrollarán posteriormente siguiendo la misma estructura.

---

# Comandos principales

Instalar dependencias:

```powershell
npm install
```

Ejecutar backend:

```powershell
npm run start:dev
```

Construir:

```powershell
npm run build
```

Ejecutar producción:

```powershell
npm run start:prod
```

Levantar PostgreSQL:

```powershell
docker compose up -d
```

Ver contenedores:

```powershell
docker compose ps
```

Detener contenedores:

```powershell
docker compose down
```
