# SafeTest — Frontend

## 1. Objetivo

El frontend de **SafeTest** será la parte de la aplicación con la que interactuarán los usuarios:

* Administrador
* Docente
* Estudiante

Se desarrollará utilizando **Next.js, React y TypeScript**, manteniendo una estructura organizada por funcionalidades.

La idea principal es separar las responsabilidades para que:

* Las páginas se encarguen de coordinar la vista.
* Los componentes se encarguen de la interfaz.
* Los hooks manejen estados y lógica de interacción.
* Los servicios se encarguen de comunicarse con el backend.
* Axios centralice la comunicación HTTP.
* Los tipos de TypeScript definan la estructura de los datos.

---

# 2. Tecnologías del frontend

| Tecnología       | Uso en SafeTest                                    |
| ---------------- | -------------------------------------------------- |
| **Next.js**      | Framework principal del frontend y manejo de rutas |
| **React**        | Construcción de componentes e interfaces           |
| **TypeScript**   | Tipado y organización del código                   |
| **Tailwind CSS** | Estilos de las interfaces                          |
| **shadcn/ui**    | Componentes de interfaz reutilizables              |
| **Axios**        | Comunicación con la API REST del backend           |

La comunicación seguirá este flujo:

```text
Usuario
   │
   ▼
Frontend Next.js
   │
   ▼
Axios
   │
   ▼
API REST
   │
   ▼
Backend NestJS
```

---

# 3. Estructura del frontend

La estructura principal será:

```text
frontend/
│
├── app/
│
├── components/
│   ├── layout/
│   └── ui/
│
├── features/
│   └── categorias/
│
├── services/
│   └── api/
│
├── lib/
│   └── axios/
│
├── constants/
│
├── public/
│
├── package.json
├── tsconfig.json
└── ...
```

A medida que se implementen las funcionalidades reales de SafeTest, `features/` crecerá con los diferentes módulos del sistema.

Por ejemplo:

```text
features/
├── auth/
├── usuarios/
├── materias/
├── periodos/
├── paralelos/
├── temas/
├── preguntas/
├── materiales/
├── evaluaciones/
├── respuestas/
├── resultados/
├── estadisticas/
└── ia/
```

---

# 4. Responsabilidad de cada carpeta

## `app/`

Contiene las **rutas y páginas** de Next.js.

Por ejemplo:

```text
app/
└── categorias/
    └── page.tsx
```

corresponde a:

```text
http://localhost:3000/categorias
```

La página no debe contener toda la lógica de la funcionalidad. Su función principal es **coordinar los componentes y la lógica necesaria para mostrar la pantalla**.

---

## `components/`

Contiene componentes reutilizables en diferentes partes del sistema.

### `components/layout/`

Componentes generales de la aplicación:

```text
components/layout/
├── Sidebar.tsx
└── Topbar.tsx
```

Estos componentes podrán utilizarse en las diferentes áreas de SafeTest.

### `components/ui/`

Componentes visuales reutilizables, por ejemplo:

```text
components/ui/
├── Button.tsx
└── Card.tsx
```

Aquí se pueden colocar elementos que puedan ser utilizados por diferentes funcionalidades.

---

# 5. `features/`

Esta es una de las partes principales de la estructura.

Cada funcionalidad importante de SafeTest tendrá su propio módulo dentro de `features`.

Por ejemplo:

```text
features/
└── categorias/
```

Más adelante:

```text
features/
├── materias/
├── preguntas/
├── evaluaciones/
├── resultados/
└── materiales/
```

Cada feature tendrá sus propios componentes, hooks, servicios y tipos.

---

# 6. Ejemplo: `features/categorias`

La funcionalidad de Categorías se está utilizando como **ejemplo y laboratorio** para establecer la forma en que se desarrollarán las funcionalidades reales de SafeTest.

Actualmente:

```text
features/
└── categorias/
    ├── types.ts
    │
    ├── components/
    │   ├── CategoriaForm.tsx
    │   └── CategoriaList.tsx
    │
    ├── hooks/
    │   └── useCategorias.ts
    │
    └── services/
        └── categorias.service.ts
```

Cada parte tiene una responsabilidad diferente.

---

# 7. `types.ts`

Define cómo son los datos utilizados por la funcionalidad.

Ejemplo:

```ts
export interface Categoria {
  id: number;
  nombre: string;
  descripcion: string | null;
}

export interface CreateCategoriaDto {
  nombre: string;
  descripcion?: string;
}

export interface UpdateCategoriaDto {
  nombre?: string;
  descripcion?: string;
}
```

Esto permite que TypeScript conozca la estructura de los datos y ayude a evitar errores.

En SafeTest cada funcionalidad tendrá sus propios tipos.

Por ejemplo:

```text
features/preguntas/types.ts
features/evaluaciones/types.ts
features/resultados/types.ts
```

---

# 8. `components/` de la feature

Los componentes contienen la **interfaz específica de esa funcionalidad**.

En Categorías tenemos:

```text
features/categorias/components/
├── CategoriaForm.tsx
└── CategoriaList.tsx
```

### `CategoriaForm.tsx`

Se encarga de mostrar el formulario para:

* Crear una categoría.
* Editar una categoría.

El componente maneja la interacción del formulario y solicita al servicio que realice la operación.

### `CategoriaList.tsx`

Se encarga de mostrar las categorías registradas y las acciones disponibles:

* Editar.
* Eliminar.

De esta manera, la página no necesita contener todo el código visual de Categorías.

---

# 9. `hooks/`

Los hooks manejan estados y lógica relacionada con la interfaz.

En Categorías:

```text
features/categorias/hooks/
└── useCategorias.ts
```

El hook se encarga, por ejemplo, de:

* Cargar las categorías.
* Guardar las categorías en el estado.
* Indicar si los datos están cargando.
* Informar si ocurrió un error.
* Volver a cargar los datos.

La página puede utilizarlo de una manera sencilla:

```tsx
const {
  categorias,
  isLoading,
  error,
  refetch,
} = useCategorias();
```

Así evitamos colocar toda la lógica de carga directamente en `page.tsx`.

---

# 10. `services/` de cada feature

Los servicios contienen las operaciones que esa funcionalidad necesita realizar contra la API.

En Categorías:

```text
features/categorias/services/
└── categorias.service.ts
```

Este servicio define operaciones como:

```text
GET     /categorias
GET     /categorias/:id
POST    /categorias
PUT     /categorias/:id
DELETE  /categorias/:id
```

Por ejemplo:

```ts
categoriasService.getAll()
categoriasService.getById(id)
categoriasService.create(data)
categoriasService.update(id, data)
categoriasService.eliminar(id)
```

El componente no necesita conocer directamente cómo funciona Axios ni la URL completa del backend.

---

# 11. `services/api/base.service.ts`

Existe un servicio base reutilizable:

```text
services/
└── api/
    └── base.service.ts
```

Su función es proporcionar operaciones HTTP comunes:

```text
GET
POST
PUT
DELETE
```

Los servicios de cada feature pueden reutilizar estas operaciones.

Por ejemplo:

```text
CategoriaService
      │
      ▼
BaseService
      │
      ▼
Axios
```

Esto evita repetir el mismo código HTTP en cada funcionalidad.

---

# 12. `lib/axios/`

Aquí se encuentra la configuración central de Axios:

```text
lib/
└── axios/
    └── client.ts
```

Actualmente se utiliza para definir la dirección del backend:

```text
http://localhost:3001
```

Por ejemplo:

```text
Frontend
   │
   ▼
Axios
   │
   ├── GET /categorias
   ├── POST /categorias
   ├── PUT /categorias/:id
   └── DELETE /categorias/:id
   │
   ▼
NestJS
```

Más adelante, cuando se implemente autenticación, esta configuración podrá utilizarse también para enviar el token JWT.

---

# 13. Flujo completo utilizando Categorías

La comunicación completa de Categorías funciona de esta manera:

```text
Usuario
   │
   ▼
app/categorias/page.tsx
   │
   ▼
CategoriaForm / CategoriaList
   │
   ▼
useCategorias
   │
   ▼
categorias.service.ts
   │
   ▼
BaseService
   │
   ▼
Axios
   │
   ▼
API REST NestJS
   │
   ▼
CategoriaController
   │
   ▼
CategoriaService
   │
   ▼
TypeORM
   │
   ▼
PostgreSQL
```

La respuesta realiza el camino inverso:

```text
PostgreSQL
   ↓
TypeORM
   ↓
NestJS
   ↓
Axios
   ↓
Service
   ↓
Hook / estado
   ↓
Componente
   ↓
Usuario
```

---

# 14. Ejemplo: crear una categoría

Cuando el usuario completa el formulario:

```text
CategoriaForm
      │
      ▼
categoriasService.create()
      │
      ▼
BaseService.post()
      │
      ▼
Axios
      │
      ▼
POST /categorias
      │
      ▼
NestJS
      │
      ▼
PostgreSQL
```

Después de guardar correctamente:

```text
Backend
   ↓
Respuesta
   ↓
onGuardado()
   ↓
refetch()
   ↓
Lista actualizada
```

---

# 15. Ejemplo: editar una categoría

Cuando el usuario selecciona **Editar**:

```text
CategoriaList
      │
      ▼
Selecciona categoría
      │
      ▼
categoriaEditar
      │
      ▼
CategoriaForm
      │
      ▼
categoriasService.update()
      │
      ▼
PUT /categorias/:id
      │
      ▼
NestJS
      │
      ▼
PostgreSQL
```

Después se vuelve a cargar la información para mostrar los datos actualizados.

---

# 16. Ejemplo: eliminar una categoría

El flujo es:

```text
CategoriaList
      │
      ▼
Eliminar
      │
      ▼
Confirmación
      │
      ▼
categoriasService.eliminar()
      │
      ▼
DELETE /categorias/:id
      │
      ▼
NestJS
      │
      ▼
PostgreSQL
      │
      ▼
refetch()
      │
      ▼
Lista actualizada
```

---

# 17. ¿Cómo se aplicará esto a SafeTest?

Categorías solamente es el ejemplo para comprobar la arquitectura.

Las funcionalidades reales seguirán el mismo principio.

Por ejemplo:

```text
features/materias/
├── types.ts
├── components/
│   ├── MateriaForm.tsx
│   └── MateriaList.tsx
├── hooks/
│   └── useMaterias.ts
└── services/
    └── materias.service.ts
```

Y para preguntas:

```text
features/preguntas/
├── types.ts
├── components/
├── hooks/
└── services/
```

Lo mismo se aplicará a evaluaciones, resultados, materiales, usuarios, etc.

No significa que todas las features tengan que tener exactamente los mismos archivos. La estructura se utilizará **según las necesidades de cada funcionalidad**.

---

# 18. Regla principal para trabajar

La idea es evitar colocar todo el código en `page.tsx`.

Por ejemplo, se debe evitar una página que tenga:

```text
page.tsx
 ├── interfaz completa
 ├── formularios
 ├── llamadas Axios
 ├── estados
 ├── lógica de edición
 ├── lógica de eliminación
 └── lógica de carga
```

En cambio:

```text
page.tsx
    │
    ├── Components
    │
    ├── Hooks
    │
    └── Services
```

Cada parte tendrá una responsabilidad clara.

---

# 19. Principio de organización

La estructura puede resumirse de la siguiente manera:

```text
PAGE
 │
 │ coordina
 ▼
COMPONENTS
 │
 │ utilizan
 ▼
HOOKS
 │
 │ solicitan operaciones
 ▼
SERVICES
 │
 │ reutilizan
 ▼
BASE SERVICE
 │
 │ utiliza
 ▼
AXIOS
 │
 │ comunica con
 ▼
API REST
```

Esto permite que una compañera pueda trabajar, por ejemplo, en `features/preguntas` sin tener que modificar toda la aplicación.

---

# 20. Reglas para el desarrollo

Al agregar una nueva funcionalidad:

1. Crear su carpeta dentro de `features/`.
2. Definir sus tipos en `types.ts`.
3. Crear los componentes necesarios.
4. Crear los hooks cuando exista lógica de estado o carga.
5. Crear su servicio para comunicarse con el backend.
6. Reutilizar `BaseService` y Axios.
7. Mantener las páginas de `app/` lo más simples posible.
8. Reutilizar los componentes generales de `components/`.
9. Evitar duplicar código cuando pueda reutilizarse.
10. Mantener el tipado de TypeScript y evitar `any` innecesarios.

---

# 21. Estructura final esperada

Conforme avance SafeTest, el frontend podrá quedar aproximadamente así:

```text
frontend/
│
├── app/
│   ├── login/
│   ├── admin/
│   ├── docente/
│   └── estudiante/
│
├── components/
│   ├── layout/
│   └── ui/
│
├── features/
│   ├── auth/
│   ├── usuarios/
│   ├── materias/
│   ├── periodos/
│   ├── paralelos/
│   ├── temas/
│   ├── preguntas/
│   ├── materiales/
│   ├── evaluaciones/
│   ├── respuestas/
│   ├── resultados/
│   ├── estadisticas/
│   └── ia/
│
├── services/
│   └── api/
│       └── base.service.ts
│
├── lib/
│   └── axios/
│       └── client.ts
│
├── constants/
│
└── public/
```

Esta estructura busca que el frontend sea **ordenado, mantenible y fácil de ampliar** a medida que se incorporen las funcionalidades de SafeTest.

---

# 22. Resumen

La arquitectura del frontend se basa en separar las responsabilidades:

```text
Next.js
   │
   ├── app/              → páginas y rutas
   │
   ├── components/       → componentes reutilizables
   │
   ├── features/         → funcionalidades de SafeTest
   │     ├── components/ → interfaz de la funcionalidad
   │     ├── hooks/      → estados y lógica de interacción
   │     ├── services/   → operaciones con la API
   │     └── types.ts    → tipos de datos
   │
   ├── services/api/     → comunicación HTTP reutilizable
   │
   └── lib/axios/        → configuración central de Axios
```

**Categorías es el ejemplo utilizado para validar esta forma de trabajo antes de comenzar con las funcionalidades reales de SafeTest.**
