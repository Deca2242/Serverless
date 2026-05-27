export interface User {
  userId: string;
  name: string;
  email: string;
}

export interface Address {
  addressId: string;
  userId: string;
  street: string;
  city: string;
}

export interface Payment {
  paymentId: string;
  userId: string;
  type: string;
  last4?: string;
}

export interface Order {
  orderId: string;
  userId: string;
  status: OrderStatus;
  total: number;
  date: string;
  shippingAddress: string;
}

export interface OrderItem {
  orderId: string;
  productSlug: string;
  productName: string;
  qty: number;
  unitPrice: number;
  subtotal: number;
}

export interface OrderDetail {
  order: Order;
  items: OrderItem[];
}

export interface UserDashboard {
  profile: User;
  addresses: Address[];
  payments: Payment[];
}

export type OrderStatus =
  | "pending"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

export const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

export const PAYMENT_TYPES = ["credit", "debit", "paypal", "cash"] as const;
export type PaymentType = (typeof PAYMENT_TYPES)[number];

export interface Category {
  slug: string;
  name: string;
  icon?: string;
}

export interface Product {
  slug: string;
  name: string;
  price: number;
  description?: string;
  imageUrl?: string;
  categorySlug: string;
}


export interface ProductListItem extends Product {
  stock: number;
}

export interface Stock {
  productSlug: string;
  qty: number;
}

export interface CartItem {
  productSlug: string;
  productName: string;
  qty: number;
  unitPrice: number;
  subtotal: number;
}

export interface Cart {
  userId: string;
  items: CartItem[];
  itemCount: number;
  total: number;
}
