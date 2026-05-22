import { z } from "zod";

export const AddCartItemSchema = z.object({
  productSlug: z.string().min(1),
  qty: z.number().int().positive(),
});

export const UpdateCartItemSchema = z.object({
  qty: z.number().int().positive(),
});

export const CheckoutSchema = z.object({
  shippingAddress: z.string().min(1),
});

export type AddCartItemInput = z.infer<typeof AddCartItemSchema>;
export type UpdateCartItemInput = z.infer<typeof UpdateCartItemSchema>;
export type CheckoutInput = z.infer<typeof CheckoutSchema>;

export interface StoredCartItem {
  qty: number;
  unitPrice: number;
  productName: string;
}
