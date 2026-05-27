import { z } from "zod";
import { ORDER_STATUSES, PAYMENT_TYPES } from "../shared/models";

export const CreateProfileSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

export const AddAddressSchema = z.object({
  addressId: z.string().uuid().optional(),
  street: z.string().min(1),
  city: z.string().min(1),
});

export const AddPaymentSchema = z.object({
  type: z.enum(PAYMENT_TYPES),
  last4: z.string().length(4).optional(),
});

export const OrderStatusQuerySchema = z.object({
  status: z.enum(ORDER_STATUSES as [string, ...string[]]).optional(),
});

export type CreateProfileInput = z.infer<typeof CreateProfileSchema>;
export type AddAddressInput = z.infer<typeof AddAddressSchema>;
export type AddPaymentInput = z.infer<typeof AddPaymentSchema>;
export type OrderStatusQuery = z.infer<typeof OrderStatusQuerySchema>;
