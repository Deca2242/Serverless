import {
  CacheKeys,
  CART_TTL_SECONDS,
  del,
  expire,
  hDel,
  hGetAll,
  hSet,
} from "../../shared/cache";
import type { StoredCartItem } from "../schemas";

export class CartRepository {
  async getRaw(userId: string): Promise<Record<string, StoredCartItem>> {
    return hGetAll<StoredCartItem>(CacheKeys.cart(userId));
  }

  async setItem(userId: string, productSlug: string, item: StoredCartItem): Promise<void> {
    await hSet(CacheKeys.cart(userId), productSlug, item);
  }

  async removeItem(userId: string, productSlug: string): Promise<void> {
    await hDel(CacheKeys.cart(userId), productSlug);
  }

  async clear(userId: string): Promise<void> {
    await del(CacheKeys.cart(userId));
  }

  async touchTtl(userId: string): Promise<void> {
    await expire(CacheKeys.cart(userId), CART_TTL_SECONDS);
  }
}
