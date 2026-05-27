/**
 * Redis wrapper con dos patrones:
 * - Cache-aside (fail-open): usuarios, catálogo → getClient() + cached()
 * - Primary store (fail-closed): carrito → getRequiredClient() + hash ops
 *
 * Mapa completo de bloques y consumidores: serverless/CONTEXT.md § cache.ts
 */
import { createClient, RedisClientType } from "redis";
import { ServiceUnavailableError } from "./errors";

// ── Bloque 1: Configuración y constantes ─────────────────────────────────────
// CACHE_DEBUG → shared/http/responses.ts (header X-Cache)
// CART_TTL_SECONDS → cart/repositories/cart.repository.ts (touchTtl)
// CacheStatus, CachedResult → user/catalog services + okCached() en handlers

const REDIS_URL = process.env.REDIS_URL ?? "redis://redis:6379";
const KEY_PREFIX = process.env.REDIS_KEY_PREFIX ?? "mg";
const DEFAULT_TTL = Number(process.env.CACHE_TTL_SECONDS ?? 300);
const CACHE_ENABLED = (process.env.CACHE_ENABLED ?? "true").toLowerCase() !== "false";
export const CACHE_DEBUG = (process.env.CACHE_DEBUG ?? "false").toLowerCase() === "true";

export type CacheStatus = "HIT" | "MISS";

export interface CachedResult<T> {
  value: T;
  cacheStatus: CacheStatus;
}

export const CART_TTL_SECONDS = 86400;

let client: RedisClientType | undefined;
let connecting: Promise<RedisClientType | undefined> | undefined;

// ── Bloque 2: Conexión Redis (singleton lazy) ────────────────────────────────
// connectRedis() → base compartida; del/delByPrefix también la usan (ignoran CACHE_ENABLED)
// getClient()    → cache-aside; respeta CACHE_ENABLED; fail-open si Redis cae
// getRequiredClient() → carrito; fail-closed (503) si Redis cae; no se importa fuera

/** Always attempts to connect (used by cart primary store). */
async function connectRedis(): Promise<RedisClientType | undefined> {
  if (client?.isOpen) return client;
  if (connecting) return connecting;

  connecting = (async () => {
    try {
      const c: RedisClientType = createClient({
        url: REDIS_URL,
        socket: { connectTimeout: 1500, reconnectStrategy: false },
      });
      c.on("error", (err) => console.warn("[cache] redis error:", err.message));
      await c.connect();
      client = c;
      return client;
    } catch (err) {
      console.warn("[cache] connect failed:", (err as Error).message);
      client = undefined;
      return undefined;
    } finally {
      connecting = undefined;
    }
  })();

  return connecting;
}

/** Cache-aside client; fail-open when CACHE_ENABLED=false or Redis down. */
async function getClient(): Promise<RedisClientType | undefined> {
  if (!CACHE_ENABLED) return undefined;
  return connectRedis();
}

/** Required Redis client for cart (NOT fail-open). */
export async function getRequiredClient(): Promise<RedisClientType> {
  const c = await connectRedis();
  if (!c) throw new ServiceUnavailableError("Redis unavailable");
  return c;
}

const fullKey = (key: string) => `${KEY_PREFIX}:${key}`;

// ── Bloque 3: Operaciones string JSON (prefijo mg: + JSON) ───────────────────
// get/set → solo usadas por cached(); fail-open vía getClient()
// del     → catalog.service (invalidación manual)

export async function get<T>(key: string): Promise<T | undefined> {
  const c = await getClient();
  if (!c) return undefined;
  try {
    const raw = await c.get(fullKey(key));
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch (err) {
    console.warn("[cache] get failed:", (err as Error).message);
    return undefined;
  }
}

export async function set<T>(
  key: string,
  value: T,
  ttlSeconds: number = DEFAULT_TTL,
): Promise<void> {
  const c = await getClient();
  if (!c) return;
  try {
    await c.setEx(fullKey(key), ttlSeconds, JSON.stringify(value));
  } catch (err) {
    console.warn("[cache] set failed:", (err as Error).message);
  }
}

export async function del(key: string): Promise<void> {
  const c = await connectRedis();
  if (!c) return;
  try {
    await c.del(fullKey(key));
  } catch (err) {
    console.warn("[cache] del failed:", (err as Error).message);
  }
}

// ── Bloque 4: Operaciones avanzadas ──────────────────────────────────────────
// delByPrefix → invalidate* + catalog.service (createProduct)
// expire      → cart.repository (touchTtl)
// hGetAll/hSet/hDel → cart.repository; hash mg:cart:{userId}, campo = productSlug

export async function delByPrefix(prefix: string): Promise<void> {
  const c = await connectRedis();
  if (!c) return;
  try {
    const match = `${fullKey(prefix)}*`;
    const keys: string[] = [];
    for await (const k of c.scanIterator({ MATCH: match, COUNT: 200 })) {
      keys.push(k as unknown as string);
    }
    if (keys.length > 0) await c.del(keys);
  } catch (err) {
    console.warn("[cache] delByPrefix failed:", (err as Error).message);
  }
}

export async function expire(key: string, ttlSeconds: number): Promise<void> {
  const c = await getRequiredClient();
  await c.expire(fullKey(key), ttlSeconds);
}

export async function hGetAll<T>(key: string): Promise<Record<string, T>> {
  const c = await getRequiredClient();
  const raw = await c.hGetAll(fullKey(key));
  const out: Record<string, T> = {};
  for (const [field, value] of Object.entries(raw)) {
    out[field] = JSON.parse(value) as T;
  }
  return out;
}

export async function hSet(key: string, field: string, value: unknown): Promise<void> {
  const c = await getRequiredClient();
  await c.hSet(fullKey(key), field, JSON.stringify(value));
}

export async function hDel(key: string, field: string): Promise<void> {
  const c = await getRequiredClient();
  await c.hDel(fullKey(key), field);
}

// ── Bloque 5: Helper cache-aside ─────────────────────────────────────────────
// cached() → user.service, catalog.service
// Flujo: get → HIT | fetcher → set → MISS

/**
 * Cache-Aside helper. Returns cached value if present; otherwise runs fetcher,
 * stores result with the given TTL, and returns it. Fail-open on Redis errors.
 */
export async function cached<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>,
): Promise<CachedResult<T>> {
  const hit = await get<T>(key);
  if (hit !== undefined) return { value: hit, cacheStatus: "HIT" };
  const value = await fetcher();
  if (value !== undefined && value !== null) {
    await set(key, value, ttlSeconds);
  }
  return { value, cacheStatus: "MISS" };
}

// ── Bloque 6: Convenciones de claves y TTL ───────────────────────────────────
// CacheKeys → factories de nombres lógicos (fullKey añade prefijo mg:)
// TTL       → segundos por tipo; stock 30s, categorías 900s

export const CacheKeys = {
  userDashboard: (userId: string) => `user:dashboard:${userId}`,
  cart: (userId: string) => `cart:${userId}`,
  catalogCategories: () => "catalog:categories",
  catalogAllProducts: () => "catalog:products:all",
  catalogCategoryProducts: (slug: string) => `catalog:category:${slug}:products`,
  catalogProduct: (slug: string) => `catalog:product:${slug}`,
  catalogStock: (slug: string) => `catalog:stock:${slug}`,
  catalogSearch: (hash: string) => `catalog:search:${hash}`,
};

export const TTL = {
  medium: 300,
  catalogCategories: 900,
  catalogCategoryProducts: 600,
  catalogProduct: 300,
  catalogStock: 30,
  catalogSearch: 90,
};

// ── Bloque 7: Invalidación ───────────────────────────────────────────────────
// invalidateCatalogProduct → catalog.service (updateStock, createProduct)
// invalidateCatalogCategories → catalog.service (createCategory, createProduct)

export async function invalidateCatalogProduct(
  slug: string,
  categorySlug?: string,
): Promise<void> {
  await Promise.all([
    del(CacheKeys.catalogProduct(slug)),
    del(CacheKeys.catalogStock(slug)),
    del(CacheKeys.catalogAllProducts()),
    delByPrefix("catalog:search:"),
    ...(categorySlug ? [del(CacheKeys.catalogCategoryProducts(categorySlug))] : []),
  ]);
}

export async function invalidateCatalogCategories(): Promise<void> {
  await Promise.all([
    del(CacheKeys.catalogCategories()),
    del(CacheKeys.catalogAllProducts()),
  ]);
}
