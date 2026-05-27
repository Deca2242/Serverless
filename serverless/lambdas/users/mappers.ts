import type { Address, Payment, User } from "../shared/models";

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
