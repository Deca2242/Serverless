# EcoCart Frontend

UI de la tienda **EcoCart** construida con Vite + React 18 + TypeScript.  
Consume el backend serverless en [`../serverless/`](../serverless/).

---

## Requisitos

- Node.js 20+
- Backend levantado con `docker compose up` en `../serverless/`

---

## 1. Levantar el backend

```bash
cd ../serverless
docker compose up
```

Espera a ver en los logs:
```
Seed completado.
```

---

## 2. Obtener el API ID

El API ID cambia en cada clean restart de Floci:

```bash
export AWS_ACCESS_KEY_ID=test AWS_SECRET_ACCESS_KEY=test AWS_DEFAULT_REGION=us-east-1

API_ID=$(aws --endpoint-url http://localhost:4566 apigatewayv2 get-apis \
  --query 'Items[0].ApiId' --output text)

echo $API_ID
```

---

## 3. Configurar variables de entorno

```bash
# Desde la carpeta front/
cp .env.local.example .env.local
```

Abre `.env.local` y reemplaza `TU_API_ID`:

```env
VITE_API_ID=TU_API_ID
```

> El frontend usa el proxy de Vite (`/api → backend`) para evitar CORS. Solo necesitas el `API_ID`; Vite construye la URL completa internamente.

---

## Imágenes de productos

Las fotos vienen del campo `imageUrl` en DynamoDB (Unsplash). Si cambias las URLs en el seed, **invalida el caché Redis** para que el API devuelva los datos nuevos:

```bash
docker exec mercado-serverless-redis redis-cli FLUSHDB
```

O re-ejecuta el seed completo:

```bash
cd ../serverless
bash scripts/seed-local.sh
docker exec mercado-serverless-redis redis-cli FLUSHDB
```

El frontend también tiene un fallback en `src/assets/productImages.ts` por si el API devuelve URLs rotas o vacías.

---

## 4. Instalar dependencias y arrancar

```bash
# Desde la carpeta front/
npm install
npm run dev
```

Abre http://localhost:5173

---

## Estructura del proyecto

```
front/
├── src/
│   ├── api/          ← Llamadas HTTP al backend (catalog, users, cart)
│   ├── config.ts     ← Constantes demo (DEMO_USER_ID)
│   ├── hooks/        ← React Query (useCategories, useProducts, useDashboard, useCart)
│   ├── types/        ← Tipos inferidos con Zod, espejo de lambdas/shared/models.ts
│   ├── components/   ← Componentes UI (Header, Sidebar, ProductGrid, etc.)
│   └── styles/       ← tokens.css (paleta) + globals.css (layout)
├── .env.local.example
└── README.md
```

---

## Usuario demo

El frontend usa el usuario `usr-jgarcia-001` (Juan García) en todas las llamadas.  
No hay login; el `userId` está definido en `src/config.ts`.

---

## Verificar que funciona

Con el backend levantado y `.env.local` configurado:

```bash
npm run dev
```

Comportamiento esperado:
- **Sidebar**: 4 categorías (Electrónica, Ropa, Hogar, Deportes)
- **Grid**: 6 productos con imagen, precio, stock y botón "Añadir al Carrito"
- **Header**: avatar clickeable muestra popup "Bienvenido, jgarcia" + dirección Bogotá
- **Badge carrito**: icono con número que sube al añadir productos

---

## Ver el cache en acción

```bash
# Primera carga:
curl -i "http://localhost:4566/restapis/TU_API_ID/\$default/_user_request_/categories"
# → X-Cache: MISS

# Segunda carga:
curl -i "http://localhost:4566/restapis/TU_API_ID/\$default/_user_request_/categories"
# → X-Cache: HIT
```

Ver [CACHE.md](./CACHE.md) para la explicación completa de los 3 niveles de cache.

---

## Comandos disponibles

| Comando | Descripción |
|---|---|
| `npm run dev` | Dev server en localhost:5173 (proxy `/api` → Floci) |
| `npm run build` | Build de producción en `dist/` |
| `npm run preview` | Preview del build estático |

> **Solo dev:** las llamadas usan `fetch("/api/...")` y el proxy de Vite reenvía al backend. `npm run preview` sirve archivos estáticos **sin** proxy — para probar el build contra Floci necesitarías un reverse proxy o configurar `VITE_API_ID` en un entorno con proxy equivalente.
