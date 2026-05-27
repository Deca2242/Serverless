import { z } from "zod";

export const CategorySchema = z.object({
  slug: z.string(),
  name: z.string(),
  icon: z.string().optional(),
});

export const ProductListItemSchema = z.object({
  slug: z.string(),
  name: z.string(),
  price: z.number(),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  categorySlug: z.string(),
  stock: z.number(),
});

export const AddressSchema = z.object({
  addressId: z.string(),
  userId: z.string(),
  street: z.string(),
  city: z.string(),
});

export const UserSchema = z.object({
  userId: z.string(),
  name: z.string(),
  email: z.string(),
});

export const UserDashboardSchema = z.object({
  profile: UserSchema,
  addresses: z.array(AddressSchema),
  payments: z.array(
    z.object({
      paymentId: z.string(),
      userId: z.string(),
      type: z.string(),
      last4: z.string().optional(),
    }),
  ),
});

export const CartItemSchema = z.object({
  productSlug: z.string(),
  productName: z.string(),
  qty: z.number(),
  unitPrice: z.number(),
  subtotal: z.number(),
});

export const CartSchema = z.object({
  userId: z.string(),
  items: z.array(CartItemSchema),
  itemCount: z.number(),
  total: z.number(),
});

export type Category = z.infer<typeof CategorySchema>;
export type ProductListItem = z.infer<typeof ProductListItemSchema>;
export type UserDashboard = z.infer<typeof UserDashboardSchema>;
export type Cart = z.infer<typeof CartSchema>;
export type CartItem = z.infer<typeof CartItemSchema>;
