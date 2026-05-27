# MercadoGlobal Serverless

> **Tutorial completo (carpeta por carpeta):** ver [TUTORIAL-COMPLETO.md](./TUTORIAL-COMPLETO.md)
> **Guía didáctica:** ver [GUIA-PROYECTO.md](./GUIA-PROYECTO.md) para una explicación paso a paso del estado actual, arquitectura y flujos de negocio.

Backend serverless de **EcoCart** usando AWS Lambda + API Gateway HTTP API + DynamoDB + Redis, desplegado localmente con [Floci](https://github.com/floci-io/floci) y AWS CDK.

---

## Requisitos previos

| Herramienta | Versión mínima | Para qué |
|---|---|---|
| [Docker](https://docs.docker.com/get-docker/) + Docker Compose | v2+ | Floci, Redis, deploy CDK |
| [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html) | v2 | Obtener API ID, probar con curl |
| Node.js | 20+ | Solo si compilas Lambdas o CDK fuera de Docker |

Credenciales locales (Floci no valida credenciales reales):

```bash
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=us-east-1
```

---

## Ejecutar el proyecto (paso a paso)

### 1. Entrar a la carpeta del proyecto

```bash
cd serverless/
```

### 2. Levantar el entorno

**Primera vez o tras cambiar seed / infra:**

```bash
docker compose down -v && rm -rf docker/floci/* infra/cdk.out
docker compose up
```

**Arranque normal** (sin borrar datos):

```bash
docker compose up
```

### 3. Qué ocurre al arrancar

| Paso | Contenedor | Acción |
|---|---|---|
| 1 | `mercado-serverless-floci` | Emula AWS en `localhost:4566` |
| 2 | `mercado-serverless-redis` | Redis en `localhost:6379` |
| 3 | `mercado-serverless-cdk` | `cdklocal bootstrap` + `deploy --all` (3 stacks CDK) |
| 4 | `mercado-serverless-cdk` | Ejecuta [scripts/seed-local.sh](./scripts/seed-local.sh) |
| 5 | `cdk-local` termina | Floci y Redis siguen corriendo |

Espera a ver en los logs del contenedor `cdk-local`:

```text
Seed completado.
  Usuarios: usr-luisa-001 (Luisa Fernanda), usr-jgarcia-001 (Juan Garcia / jgarcia)
  ...
```

El contenedor `cdk-local` puede quedar en estado `Exited (0)` — es normal.

### 4. Obtener el API ID y la URL base

Floci genera un **API ID** distinto en cada deploy limpio. Necesitas ese ID para armar la URL de la API.

```bash
export AWS_ACCESS_KEY_ID=test AWS_SECRET_ACCESS_KEY=test

API_ID=$(aws --endpoint-url http://localhost:4566 apigatewayv2 get-apis \
  --query 'Items[0].ApiId' --output text)

echo "API_ID=$API_ID"
```

Construye la **URL base**:

```bash
BASE="http://localhost:4566/restapis/${API_ID}/\$default/_user_request_"
echo "$BASE"
```

Ejemplo de URL completa para un endpoint:

```text
http://localhost:4566/restapis/267d20a04a/$default/_user_request_/products
```

> **Postman:** codifica `$` como `%24` → `%24default` en lugar de `$default`.

> **Frontend (Vite/React):** copia [`front/.env.local.example`](../front/.env.local.example) a `front/.env.local` y define el API ID de Floci:
> ```env
> VITE_API_ID=TU_API_ID
> ```
> El frontend usa el proxy de Vite (`/api → Floci`); no necesitas pegar la URL completa en el navegador.

Script todo-en-uno (copiar y pegar):

```bash
export AWS_ACCESS_KEY_ID=test AWS_SECRET_ACCESS_KEY=test AWS_DEFAULT_REGION=us-east-1

API_ID=$(aws --endpoint-url http://localhost:4566 apigatewayv2 get-apis \
  --query 'Items[0].ApiId' --output text)

export BASE="http://localhost:4566/restapis/${API_ID}/\$default/_user_request_"

echo "BASE=$BASE"
```

### 5. Verificar que el backend responde

**Verificación automatizada (recomendado):**

```bash
export AWS_ACCESS_KEY_ID=test AWS_SECRET_ACCESS_KEY=test AWS_DEFAULT_REGION=us-east-1
bash scripts/verify-ecocart.sh
```

El script valida endpoints EcoCart, flujo de carrito, claves Redis (`mg:catalog:*`) e invalidación de cache. Con `CACHE_DEBUG=true` (activo en `docker-compose.yml` local) también comprueba el header `X-Cache: HIT` en la segunda lectura de `/categories`.

Si cambiaste código de Lambdas y el script falla en cache o validación, redeploy:

```bash
cd infra && cdklocal deploy --all --require-approval never
```

**Comprobación manual rápida:**

```bash
curl -s "$BASE/categories" | head -c 200
curl -s "$BASE/products" | head -c 200
curl -s "$BASE/users/usr-jgarcia-001/dashboard" | head -c 200
```

Respuestas esperadas:

- `/categories` → 4 categorías (`electronica`, `ropa`, `hogar`, `deportes`)
- `/products` → 6 productos con campo `stock`
- `/users/usr-jgarcia-001/dashboard` → Juan García + dirección + pago

### 6. Cuándo hacer clean restart

Haz clean restart si:

- Modificaste [scripts/seed-local.sh](./scripts/seed-local.sh)
- Cambiaste infra CDK o Lambdas
- Ves datos viejos del catálogo (cache Redis)
- Floci quedó inconsistente tras reinicios parciales

```bash
docker compose down -v && rm -rf docker/floci/* infra/cdk.out && docker compose up
```

Tras un clean restart, **vuelve a obtener el API_ID** (puede cambiar).

---

## Seed — datos demo

El script [scripts/seed-local.sh](./scripts/seed-local.sh) carga datos en DynamoDB tras el deploy. Se ejecuta automáticamente al final de `docker compose up`.

### Orden de carga

1. Usuario `usr-luisa-001` (perfil, dirección, pago)
2. Usuario `usr-jgarcia-001` (mockup EcoCart — popup del header)
3. 4 categorías EcoCart
4. 6 productos + stock
5. Pedidos demo de Luisa (ORD-555, ORD-600)

### Usuarios

| userId | Nombre | Email | Uso |
|---|---|---|---|
| `usr-jgarcia-001` | Juan García | jgarcia@example.com | Mockup EcoCart (carrito, popup) |
| `usr-luisa-001` | Luisa Fernanda | luisa@example.com | Pedidos históricos demo |

Dirección mockup (jgarcia): `Calle 100 # 12 - 34, Apto 501, Bogotá, Colombia`  
Pago demo: tarjeta credit, last4 `4242`

### Catálogo EcoCart

| Categoría | Slug | Productos |
|---|---|---|
| Electrónica | `electronica` | telefono-x100, portatil-workpro-15, auriculares-z5, smartwatch-fittrack |
| Ropa | `ropa` | camiseta-algodon-hombre |
| Deportes | `deportes` | mochila-viaje |
| Hogar | `hogar` | *(vacía — sidebar funcional, lista vacía al filtrar)* |

| Producto | Slug | Precio (COP) | Stock |
|---|---|---:|---:|
| Teléfono Inteligente X100 | `telefono-x100` | 850.000 | 15 |
| Portátil WorkPro 15 | `portatil-workpro-15` | 3.200.000 | 8 |
| Audífonos Bluetooth Z5 | `auriculares-z5` | 420.000 | 25 |
| Smartwatch FitTrack | `smartwatch-fittrack` | 650.000 | 12 |
| Mochila de Viaje | `mochila-viaje` | 180.000 | 20 |
| Camiseta Algodón Hombre | `camiseta-algodon-hombre` | 89.000 | 30 |

Imágenes: cada producto tiene `imageUrl` apuntando a URLs de Unsplash (`images.unsplash.com`). No hay bucket S3 de productos aún.

### Pedidos demo (Luisa)

| orderId | Estado | Resumen |
|---|---|---|
| `ORD-555` | delivered | Camiseta + pantalón |
| `ORD-600` | shipped | Teléfono X100 |

### Re-ejecutar el seed manualmente

Si Floci ya está arriba y solo quieres recargar datos:

```bash
export AWS_ENDPOINT_URL=http://localhost:4566
export AWS_ACCESS_KEY_ID=test AWS_SECRET_ACCESS_KEY=test
bash scripts/seed-local.sh
```

---

## Endpoints disponibles

URL base: `{BASE}/{ruta}` — ver sección [Obtener el API ID](#4-obtener-el-api-id-y-la-url-base).

### Usuarios

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/users` | Crear perfil |
| GET | `/users/{userId}/profile` | Obtener perfil |
| GET | `/users/{userId}/dashboard` | Perfil + direcciones + pagos |
| GET | `/users/{userId}/addresses` | Listar direcciones |
| POST | `/users/{userId}/addresses` | Agregar dirección |
| DELETE | `/users/{userId}/addresses/{addressId}` | Eliminar dirección |
| GET | `/users/{userId}/payments` | Listar pagos |
| POST | `/users/{userId}/payments` | Agregar pago |
| DELETE | `/users/{userId}/payments/{paymentId}` | Eliminar pago |
| GET | `/users/{userId}/orders` | Listar pedidos (`?status=delivered`) |

### Pedidos

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/orders` | Crear pedido (admin; **no descuenta stock**) |
| GET | `/orders/{orderId}` | Cabecera del pedido |
| GET | `/orders/{orderId}/items` | Items del pedido |
| GET | `/orders/{orderId}/detail` | Detalle completo |
| PATCH | `/orders/{orderId}/status` | Actualizar estado |

> **Dos caminos para crear pedidos:** el flujo de la tienda usa `POST /cart/{userId}/checkout`, que crea el pedido y **descuenta stock** en una transacción DynamoDB. `POST /orders` crea pedidos directamente (útil para datos demo o admin) pero **no modifica el inventario**. Para la UI EcoCart, usa siempre checkout.

### Catálogo (EcoCart)

Las respuestas de listado y detalle incluyen el campo **`stock`**.

| Método | Ruta | Descripción | Cache TTL |
|---|---|---|---:|
| GET | `/categories` | Listar categorías (sidebar) | 900s |
| POST | `/categories` | Crear categoría (admin) | invalida |
| GET | `/categories/{slug}/products` | Productos por categoría con stock | 600s |
| GET | `/products` | Listado global con stock (grid home) | 600s |
| GET | `/products?q=` | Búsqueda por nombre/slug con stock | 90s |
| GET | `/products/{slug}` | Detalle producto con stock | 300s |
| GET | `/products/{slug}/stock` | Solo stock | 30s |
| POST | `/products` | Crear producto (admin) | invalida |
| PATCH | `/products/{slug}/stock` | Actualizar stock (admin) | invalida |

### Carrito

| Método | Ruta | Body / notas |
|---|---|---|
| GET | `/cart/{userId}` | Carrito + `itemCount` + `total` |
| POST | `/cart/{userId}/items` | `{"productSlug":"...", "qty":1}` |
| PATCH | `/cart/{userId}/items/{slug}` | `{"qty":2}` |
| DELETE | `/cart/{userId}/items/{slug}` | Quitar item |
| DELETE | `/cart/{userId}` | Vaciar carrito |
| POST | `/cart/{userId}/checkout` | `{"shippingAddress":"..."}` |

---

## Ejemplos curl completos

```bash
export AWS_ACCESS_KEY_ID=test AWS_SECRET_ACCESS_KEY=test AWS_DEFAULT_REGION=us-east-1

API_ID=$(aws --endpoint-url http://localhost:4566 apigatewayv2 get-apis \
  --query 'Items[0].ApiId' --output text)
BASE="http://localhost:4566/restapis/${API_ID}/\$default/_user_request_"

# --- Catálogo (home EcoCart) ---
curl "$BASE/categories"
curl "$BASE/products"
curl "$BASE/categories/electronica/products"
curl "$BASE/categories/hogar/products"          # → []
curl "$BASE/products?q=telefono"
curl "$BASE/products/telefono-x100"

# --- Usuario mockup ---
curl "$BASE/users/usr-jgarcia-001/dashboard"

# --- Carrito ---
curl -X POST "$BASE/cart/usr-jgarcia-001/items" \
  -H "Content-Type: application/json" \
  -d '{"productSlug":"telefono-x100","qty":1}'

curl "$BASE/cart/usr-jgarcia-001"

curl -X POST "$BASE/cart/usr-jgarcia-001/checkout" \
  -H "Content-Type: application/json" \
  -d '{"shippingAddress":"Calle 100 # 12 - 34, Apto 501, Bogota, Colombia"}'

# --- Pedidos demo (Luisa) ---
curl "$BASE/users/usr-luisa-001/orders?status=delivered"
curl "$BASE/orders/ORD-555/detail"
```

---

## Conectar un frontend

1. Backend corriendo (`docker compose up`).
2. Obtener `API_ID` y definir `VITE_API_ID` en `front/.env.local` (ver [`front/README.md`](../front/README.md)).
3. Arrancar el frontend con `npm run dev` — Vite proxya `/api` hacia Floci.
4. Usuario demo hardcodeado: `usr-jgarcia-001` (no hay auth aún).

Ejemplo mínimo (desde el proxy de Vite en dev):

```typescript
const res = await fetch("/api/products");
const products = await res.json();
// products[].imageUrl, .stock, .price, .slug
```

Más detalle en [GUIA-PROYECTO.md](./GUIA-PROYECTO.md) sección 7 (flujos de negocio).

---

## Tecnologías

| Capa | Tecnología |
|---|---|
| Lenguaje | TypeScript + Node.js 20 |
| Funciones | AWS Lambda (`NodejsFunction` + esbuild) |
| API | API Gateway HTTP API v2 |
| Base de datos | DynamoDB single-table |
| Cache / Carrito | Redis 7 (cache-aside + carrito primary store) |
| Emulador local | Floci |
| Infraestructura | AWS CDK v2 |
| Deploy local | `cdklocal` (aws-cdk-local) |

---

## Estructura del código

Cada Lambda sigue capas handler → service → repository:

```
serverless/
├── lambdas/
│   ├── shared/          models, dynamodb, cache, errors, validation
│   ├── users/
│   ├── orders/
│   ├── catalog/
│   └── cart/
├── infra/
│   ├── bin/app.ts
│   └── lib/             PersistenceStack, CoreStack, ApiStack
├── scripts/seed-local.sh
├── docker-compose.yml
└── Dockerfile.cdk
```

| Capa | Responsabilidad |
|---|---|
| **handler.ts** | Routing HTTP (`routeKey`), params, respuesta JSON |
| **service.ts** | Reglas de negocio, cache-aside, invalidación |
| **repository.ts** | I/O DynamoDB / Redis |
| **schemas.ts** | Validación Zod |
| **mappers.ts** | DynamoDB item ↔ modelo dominio |

---

## Redis: cache vs carrito

| Uso | Comportamiento si Redis cae |
|---|---|
| **Cache-aside** (usuarios, pedidos, catálogo) | Fail-open — responde desde DynamoDB |
| **Carrito** (`/cart/*`) | **503** — no hay fallback en DynamoDB |

| Variable | Default | Efecto |
|---|---|---|
| `REDIS_URL` | `redis://redis:6379` | Conexión Redis |
| `REDIS_KEY_PREFIX` | `mg` | Prefijo claves (`mg:cart:{userId}`) |
| `CACHE_ENABLED` | `true` | Desactiva cache-aside |
| `CACHE_TTL_SECONDS` | `300` | TTL default cache-aside |

---

## Modelo DynamoDB — Single Table

Tabla: `MercadoGlobal`

| Entidad | PK | SK | GSI1PK | GSI1SK |
|---|---|---|---|---|
| Perfil usuario | `USER#{userId}` | `#PROFILE` | — | — |
| Dirección | `USER#{userId}` | `ADDRESS#{id}` | — | — |
| Pago | `USER#{userId}` | `PAYMENT#{id}` | — | — |
| Ref. orden | `USER#{userId}` | `ORDER#{date}#{orderId}` | `USER#{userId}#STATUS#{status}` | `{date}` |
| Orden | `ORDER#{orderId}` | `#METADATA` | — | — |
| Item orden | `ORDER#{orderId}` | `ITEM#{slug}` | — | — |
| Categoría | `CATEGORY#{slug}` | `#METADATA` | — | — |
| Producto | `PRODUCT#{slug}` | `#METADATA` | `CATEGORY#{slug}` | `PRODUCT#{name}` |
| Stock | `PRODUCT#{slug}` | `#STOCK` | — | — |

**GSI1** (`GSI1-UserStatus-Date`): productos por categoría y pedidos por estado de usuario.

**Carrito:** Redis Hash `mg:cart:{userId}`, TTL 24h deslizante.

---

## Deploy manual (opcional)

Si prefieres desplegar sin Docker Compose:

```bash
cd infra
npm install

export AWS_ENDPOINT_URL=http://localhost:4566
export AWS_DEFAULT_REGION=us-east-1
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test

npm run cdk:bootstrap
npm run cdk:deploy

# Seed
cd ..
bash scripts/seed-local.sh
```

---

## Solución de problemas

| Síntoma | Causa probable | Solución |
|---|---|---|
| `Invalid API id` | API_ID incorrecto o Floci sin deploy | Esperar seed, obtener API_ID de nuevo |
| `TableNames: []` | Floci sin estado / credenciales | `export AWS_ACCESS_KEY_ID=test`, clean restart |
| Datos viejos en catálogo | Cache Redis | Clean restart |
| `/cart/*` → 503 | Redis caído | `docker compose ps`, reiniciar redis |
| Postman 403/404 | URL mal formada | Usar `%24default`, verificar API_ID |
