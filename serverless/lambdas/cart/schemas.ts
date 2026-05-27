import { z } from "zod";

export const AddCartItemSchema = z.object({
  productSlug: z.string().min(1),
  qty: z.number().int().positive(),
});

export type AddCartItemInput = z.infer<typeof AddCartItemSchema>;

export interface StoredCartItem {
  qty: number;
  unitPrice: number;
  productName: string;
}
