import { createClient, RedisClientType } from "redis";
import { ServiceUnavailableError } from "./errors";

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

export async function hGetAll<T>(
  key: string,
): Promise<Record<string, T>> {
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

export const CacheKeys = {
  userProfile: (userId: string) => `user:profile:${userId}`,
  userDashboard: (userId: string) => `user:dashboard:${userId}`,
  userAddresses: (userId: string) => `user:addresses:${userId}`,
  userPayments: (userId: string) => `user:payments:${userId}`,
  userOrders: (userId: string) => `user:orders:${userId}`,
  userOrdersByStatus: (userId: string, status: string) =>
    `user:orders:${userId}:status:${status}`,
  orderHeader: (orderId: string) => `order:header:${orderId}`,
  orderItems: (orderId: string) => `order:items:${orderId}`,
  orderDetail: (orderId: string) => `order:detail:${orderId}`,
  cart: (userId: string) => `cart:${userId}`,
  catalogCategories: () => "catalog:categories",
  catalogAllProducts: () => "catalog:products:all",
  catalogCategoryProducts: (slug: string) => `catalog:category:${slug}:products`,
  catalogProduct: (slug: string) => `catalog:product:${slug}`,
  catalogStock: (slug: string) => `catalog:stock:${slug}`,
  catalogSearch: (hash: string) => `catalog:search:${hash}`,
};

export const TTL = {
  short: 180,
  medium: 300,
  long: 600,
  catalogCategories: 900,
  catalogCategoryProducts: 600,
  catalogProduct: 300,
  catalogStock: 30,
  catalogSearch: 90,
};

/** Invalidate cached lists of orders for a user (all status variants). */
export async function invalidateUserOrders(userId: string): Promise<void> {
  await Promise.all([
    delByPrefix(`user:orders:${userId}`),
    del(CacheKeys.userDashboard(userId)),
  ]);
}

/** Invalidate a specific order's cached views (header/detail) and its owner's lists. */
export async function invalidateOrder(orderId: string, userId: string): Promise<void> {
  await Promise.all([
    del(CacheKeys.orderHeader(orderId)),
    del(CacheKeys.orderDetail(orderId)),
    invalidateUserOrders(userId),
  ]);
}

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
