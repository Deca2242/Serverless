import type { Order, OrderItem } from "../shared/models";

export function itemToOrderMetadata(item: Record<string, unknown>): Order {
  return {
    orderId: (item.PK as string).replace("ORDER#", ""),
    userId: (item.userId as string).replace("USER#", ""),
    status: item.status as Order["status"],
    total: Number(item.total),
    date: (item.date as string) ?? "",
    shippingAddress: (item.shippingAddress as string) ?? "",
  };
}

export function itemToOrderItem(item: Record<string, unknown>): OrderItem {
  return {
    orderId: (item.PK as string).replace("ORDER#", ""),
    productSlug: (item.SK as string).replace("ITEM#", ""),
    productName: item.productName as string,
    qty: Number(item.qty),
    unitPrice: Number(item.unitPrice),
    subtotal: Number(item.subtotal),
  };
}
