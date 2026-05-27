import { DEMO_USER_ID } from "../config";
import { api, apiVoid } from "./client";
import { CartSchema } from "../types/models";

export function getCart(userId = DEMO_USER_ID) {
  return api(`/cart/${userId}`, CartSchema);
}

export function addItem(
  productSlug: string,
  qty: number,
  userId = DEMO_USER_ID,
) {
  return api(`/cart/${userId}/items`, CartSchema, {
    method: "POST",
    body: JSON.stringify({ productSlug, qty }),
  });
}

export function removeItem(productSlug: string, userId = DEMO_USER_ID) {
  return apiVoid(`/cart/${userId}/items/${productSlug}`, { method: "DELETE" });
}
