import type { Address, Order, Payment, User } from "../shared/models";

export function itemToUser(item: Record<string, unknown>): User {
  return {
    userId: (item.PK as string).replace("USER#", ""),
    name: item.name as string,
    email: item.email as string,
  };
}

export function itemToAddress(item: Record<string, unknown>): Address {
  return {
    addressId: (item.SK as string).replace("ADDRESS#", ""),
    userId: (item.PK as string).replace("USER#", ""),
    street: item.street as string,
    city: item.city as string,
  };
}

export function itemToPayment(item: Record<string, unknown>): Payment {
  return {
    paymentId: (item.SK as string).replace("PAYMENT#", ""),
    userId: (item.PK as string).replace("USER#", ""),
    type: item.type as string,
    last4: item.last4 as string | undefined,
  };
}

export function itemToOrderRef(item: Record<string, unknown>): Order {
  return {
    orderId: item.orderId as string,
    userId: (item.PK as string).replace("USER#", ""),
    status: item.status as Order["status"],
    total: Number(item.total),
    date: (item.GSI1SK as string) ?? "",
    shippingAddress: (item.shippingAddress as string) ?? "",
  };
}
