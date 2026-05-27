# Cache en EcoCart — 3 niveles explicados

Este documento explica dónde vive el cache en cada parte del sistema, por qué existe y cómo verificarlo.

---

## Diagrama general

```
Usuario navega EcoCart
        │
        ▼
┌─────────────────────────────────────────────┐
│  Nivel 1: React Query (navegador, memoria)  │
│  staleTime: 60s lecturas / 0s carrito       │
└──────────────┬──────────────────────────────┘
               │ cache MISS o staleTime expirado
               ▼
┌─────────────────────────────────────────────┐
│  API Gateway HTTP v2 → Lambda handler       │
│  (sin cache aquí — solo routing)            │
└──────────────┬──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────┐
│  Nivel 2: Redis (servidor, cache-aside)     │
│  TTL: 90s–900s según recurso               │
│  Claves: mg:catalog:*, mg:user:*           │
└──────────────┬──────────────────────────────┘
               │ cache MISS
               ▼
┌─────────────────────────────────────────────┐
│  Nivel 3: DynamoDB (fuente de verdad)       │
│  Solo se toca en MISS o escrituras          │
└─────────────────────────────────────────────┘
```

---

## Nivel 1: React Query (navegador)

**Dónde:** `front/src/main.tsx` + `front/src/hooks/`

**Cómo funciona:** Cada `useQuery` guarda la respuesta en memoria. Mientras el dato esté "fresco" (`staleTime` no expirado), React Query lo devuelve sin hacer ningún fetch.

| Hook | staleTime | Por qué |
|---|---|---|
| `useCategories` | 60 s | El sidebar raramente cambia |
| `useProducts` | 60 s (búsqueda: 30 s) | Catálogo estable; búsquedas algo más dinámicas |
| `useDashboard` | 60 s | Perfil y dirección casi nunca cambian en una sesión |
| `useCart` | **0 s** | Siempre refetch; se invalida tras cada mutación |

**Invalidación del carrito:**
```typescript
// front/src/hooks/useCart.ts
useMutation({
  mutationFn: ({ productSlug, qty }) => addItem(productSlug, qty),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart', DEMO_USER_ID] }),
});
```

Al añadir un producto → `invalidateQueries` → React Query hace refetch del carrito → badge actualizado.

---

## Nivel 2: Redis cache-aside (backend)

**Dónde:** `serverless/lambdas/shared/cache.ts` + services

**Patrón cache-aside:**
```
Service recibe request
    → intenta leer de Redis
    → si HIT: devuelve JSON cacheado (≈5ms)
    → si MISS: consulta DynamoDB, guarda en Redis con TTL, devuelve
```

**Implementación real** en `catalogService.listCategories()`:
```typescript
return cached(CacheKeys.catalogCategories(), TTL.catalogCategories, () =>
  this.repo.scanCategories(),
);
```

**Fail-open:** si Redis cae, el catálogo sigue respondiendo desde DynamoDB (más lento). El carrito es fail-closed: si Redis cae, el carrito devuelve 503.

### Claves Redis por recurso EcoCart

| Pantalla | Endpoint | Clave Redis | TTL |
|---|---|---|---|
| Sidebar categorías | `GET /categories` | `mg:catalog:categories` | 900 s |
| Grid productos | `GET /products` | `mg:catalog:products:all` | 600 s |
| Filtro "Electrónica" | `GET /categories/electronica/products` | `mg:catalog:category:electronica:products` | 600 s |
| Búsqueda | `GET /products?q=telefono` | `mg:catalog:search:{hash}` | 90 s |
| Popup usuario | `GET /users/usr-jgarcia-001/dashboard` | `mg:user:dashboard:usr-jgarcia-001` | 300 s |
| Badge carrito | `GET /cart/usr-jgarcia-001` | `mg:cart:usr-jgarcia-001` (Hash) | 24 h |

### Header X-Cache

Con `CACHE_DEBUG=true` (activo en `docker-compose.yml` local), cada respuesta lleva:

```
X-Cache: HIT    ← datos vinieron de Redis
X-Cache: MISS   ← datos vinieron de DynamoDB
```

### Invalidación

Al hacer `POST /cart/usr-jgarcia-001/checkout`:
1. Borra `mg:cart:usr-jgarcia-001`
2. Borra `mg:catalog:products:all` (stock cambió)
3. Borra `mg:catalog:category:{slug}:products` del ítem comprado
4. Borra `mg:user:orders:usr-jgarcia-001` (nuevo pedido)

---

## Nivel 3: DynamoDB (fuente de verdad)

Solo se consulta cuando Redis no tiene la clave. En producción, el 95%+ de las lecturas deberían ser cache HIT.

**Operaciones por pantalla:**

| Request | Operación DynamoDB |
|---|---|
| `GET /categories` | Scan con filtro `CATEGORY#` |
| `GET /products` | Scan `PRODUCT#` + BatchGet stock |
| `GET /categories/{slug}/products` | Query GSI1 `CATEGORY#{slug}` |
| `GET /users/.../dashboard` | GetItem `#PROFILE` + Query `ADDRESS#*` + Query `PAYMENT#*` |
| `GET /cart/...` | **Solo Redis** — no toca DynamoDB |

---

## Verificar el cache manualmente

### 1. Header X-Cache desde el navegador (DevTools)

1. Abre DevTools → Network
2. Recarga la página (`F5`)
3. Busca la request a `/categories`
4. Headers de respuesta: `X-Cache: MISS` (primera vez)
5. Recarga de nuevo: `X-Cache: HIT`

### 2. Inspeccionar Redis directamente

```bash
# Ver todas las claves del proyecto
docker exec mercado-serverless-redis redis-cli KEYS "mg:*"

# Ver TTL de categorías
docker exec mercado-serverless-redis redis-cli TTL mg:catalog:categories

# Ver contenido del carrito
docker exec mercado-serverless-redis redis-cli HGETALL mg:cart:usr-jgarcia-001
```

### 3. Script automatizado

```bash
cd ../serverless
export AWS_ACCESS_KEY_ID=test AWS_SECRET_ACCESS_KEY=test AWS_DEFAULT_REGION=us-east-1
bash scripts/verify-ecocart.sh
```

Pasa 30/30 checks incluyendo verificación de `X-Cache: HIT`.

---

## Por qué se eligió este diseño

| Alternativa | Por qué no se usó |
|---|---|
| Cache en el frontend (localStorage) | Datos stale entre pestañas; problemas de sincronización |
| HTTP Cache-Control headers | Lambda + Floci no propagan `Cache-Control` al cliente |
| CDN (CloudFront) | No aplica en entorno local con Floci |
| Redis en el frontend | El navegador no puede conectarse a Redis directamente |

**React Query** + **Redis cache-aside** es el balance correcto: React Query elimina refetchs redundantes en la misma sesión, Redis sirve todos los usuarios en ~5ms sin tocar DynamoDB.
