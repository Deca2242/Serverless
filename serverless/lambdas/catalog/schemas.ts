import { z } from "zod";

export const CreateCategorySchema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  icon: z.string().optional(),
});

export const CreateProductSchema = z.object({
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  price: z.number().positive(),
  description: z.string().optional(),
  imageUrl: z.string().url().optional(),
  categorySlug: z.string().min(1),
  stockQty: z.number().int().nonnegative().default(0),
});

export const UpdateStockSchema = z.object({
  qty: z.number().int().nonnegative(),
});

export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>;
export type CreateProductInput = z.infer<typeof CreateProductSchema>;
export type UpdateStockInput = z.infer<typeof UpdateStockSchema>;
