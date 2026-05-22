import { z } from "zod";
import { PAYMENT_TYPES } from "../shared/models";

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

export type CreateProfileInput = z.infer<typeof CreateProfileSchema>;
export type AddAddressInput = z.infer<typeof AddAddressSchema>;
export type AddPaymentInput = z.infer<typeof AddPaymentSchema>;
