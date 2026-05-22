import type { Cart, CartItem } from "../shared/models";
import type { StoredCartItem } from "./schemas";

export function buildCart(userId: string, raw: Record<string, StoredCartItem>): Cart {
  const items: CartItem[] = Object.entries(raw).map(([productSlug, stored]) => ({
    productSlug,
    productName: stored.productName,
    qty: stored.qty,
    unitPrice: stored.unitPrice,
    subtotal: stored.qty * stored.unitPrice,
  }));
  const itemCount = items.reduce((sum, i) => sum + i.qty, 0);
  const total = items.reduce((sum, i) => sum + i.subtotal, 0);
  return { userId, items, itemCount, total };
}
