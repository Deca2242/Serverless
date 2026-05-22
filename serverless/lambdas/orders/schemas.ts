import { z } from "zod";
import { ORDER_STATUSES } from "../shared/models";

export const OrderItemInputSchema = z.object({
  productSlug: z.string().min(1),
  productName: z.string().min(1),
  qty: z.number().int().positive(),
  unitPrice: z.number().positive(),
});

export const CreateOrderSchema = z.object({
  order: z.object({
    userId: z.string().uuid(),
    shippingAddress: z.string().min(1),
  }),
  items: z.array(OrderItemInputSchema).min(1),
});

export const UpdateStatusSchema = z.object({
  newStatus: z.enum(ORDER_STATUSES as [string, ...string[]]),
});

export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;
export type UpdateStatusInput = z.infer<typeof UpdateStatusSchema>;
