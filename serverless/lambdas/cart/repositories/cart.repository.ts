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
  // Record<slug,StoredCartItem> — hash completo del carrito del usuario
  async getRaw(userId: string): Promise<Record<string, StoredCartItem>> {
    return hGetAll<StoredCartItem>(CacheKeys.cart(userId));
  }

  // void — agrega o actualiza un producto en el carrito
  async setItem(userId: string, productSlug: string, item: StoredCartItem): Promise<void> {
    await hSet(CacheKeys.cart(userId), productSlug, item);
  }

  // void — elimina un producto del carrito
  async removeItem(userId: string, productSlug: string): Promise<void> {
    await hDel(CacheKeys.cart(userId), productSlug);
  }

  // void — vacía el carrito del usuario
  async clear(userId: string): Promise<void> {
    await del(CacheKeys.cart(userId));
  }

  // void — renueva el TTL del carrito a 24h
  async touchTtl(userId: string): Promise<void> {
    await expire(CacheKeys.cart(userId), CART_TTL_SECONDS);
  }
}
