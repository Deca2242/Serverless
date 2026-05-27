import { v4 as uuidv4 } from "uuid";

import {
  cached,
  CacheKeys,
  TTL,
  invalidateOrder,
  invalidateUserOrders,
} from "../../shared/cache";
import { NotFoundError } from "../../shared/errors";
import type { Order, OrderDetail, OrderItem } from "../../shared/models";
import { parseBody } from "../../shared/validation";
import { CreateOrderSchema, UpdateStatusSchema } from "../schemas";
import { OrderRepository } from "../repositories/order.repository";

export class OrderService {
  constructor(private readonly repo: OrderRepository) {}

  private async fetchHeader(orderId: string): Promise<Order> {
    const order = await this.repo.findHeader(orderId);
    if (!order) throw new NotFoundError(`Order '${orderId}'`);
    return order;
  }

  private async fetchItems(orderId: string): Promise<OrderItem[]> {
    return this.repo.findItems(orderId);
  }

  private async fetchDetail(orderId: string): Promise<OrderDetail> {
    const detail = await this.repo.findDetail(orderId);
    if (!detail) throw new NotFoundError(`Order '${orderId}'`);
    return detail;
  }

  async createOrder(body?: string): Promise<{ orderId: string; total: number; status: string }> {
    const parsed = parseBody(CreateOrderSchema, body);

    const orderId = uuidv4();
    const date = new Date().toISOString();
    const { userId, shippingAddress } = parsed.order;

    const fullItems: OrderItem[] = parsed.items.map((item) => ({
      ...item,
      orderId,
      subtotal: item.qty * item.unitPrice,
    }));

    const total = fullItems.reduce((sum, item) => sum + item.subtotal, 0);
    const status = "pending" as const;

    await this.repo.createOrder({
      orderId,
      userId,
      date,
      shippingAddress,
      status,
      total,
      items: fullItems,
    });

    await invalidateUserOrders(userId);

    return { orderId, total, status };
  }

  async getHeader(orderId: string): Promise<Order> {
    const { value } = await cached(CacheKeys.orderHeader(orderId), TTL.medium, () =>
      this.fetchHeader(orderId),
    );
    return value;
  }

  async listItems(orderId: string): Promise<OrderItem[]> {
    const { value } = await cached(CacheKeys.orderItems(orderId), TTL.long, () =>
      this.fetchItems(orderId),
    );
    return value;
  }

  async getFullDetail(orderId: string): Promise<OrderDetail> {
    const { value } = await cached(CacheKeys.orderDetail(orderId), TTL.medium, () =>
      this.fetchDetail(orderId),
    );
    return value;
  }

  async updateStatus(
    orderId: string,
    body?: string,
  ): Promise<{ orderId: string; newStatus: string }> {
    const { newStatus } = parseBody(UpdateStatusSchema, body);

    const currentOrder = await this.fetchHeader(orderId);
    const { userId, date } = currentOrder;

    await this.repo.updateStatus(orderId, userId, date, newStatus as Order["status"]);
    await invalidateOrder(orderId, userId);

    return { orderId, newStatus };
  }
}
