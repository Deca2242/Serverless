import {
  GetCommand,
  QueryCommand,
  TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";

import { getDocClient, TABLE_NAME, Keys, normalizeOrderDate, gsi1UserStatusKey } from "../../shared/dynamodb";
import type { Order, OrderDetail, OrderItem } from "../../shared/models";
import { itemToOrderItem, itemToOrderMetadata } from "../mappers";

export interface CreateOrderData {
  orderId: string;
  userId: string;
  date: string;
  shippingAddress: string;
  status: Order["status"];
  total: number;
  items: OrderItem[];
}

export class OrderRepository {
  async findHeader(orderId: string): Promise<Order | null> {
    const res = await getDocClient().send(
      new GetCommand({ TableName: TABLE_NAME, Key: Keys.orderMetadata(orderId) }),
    );
    return res.Item ? itemToOrderMetadata(res.Item as Record<string, unknown>) : null;
  }

  async findItems(orderId: string): Promise<OrderItem[]> {
    const res = await getDocClient().send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
        ExpressionAttributeValues: {
          ":pk": `ORDER#${orderId}`,
          ":prefix": "ITEM#",
        },
      }),
    );
    return (res.Items ?? []).map((i) => itemToOrderItem(i as Record<string, unknown>));
  }

  async findDetail(orderId: string): Promise<OrderDetail | null> {
    const [order, items] = await Promise.all([
      this.findHeader(orderId),
      this.findItems(orderId),
    ]);
    if (!order) return null;
    return { order, items };
  }

  async createOrder(data: CreateOrderData): Promise<void> {
    const { orderId, userId, date, shippingAddress, status, total, items } = data;
    const dateZ = normalizeOrderDate(date);

    await getDocClient().send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Put: {
              TableName: TABLE_NAME,
              Item: {
                ...Keys.orderMetadata(orderId),
                userId: `USER#${userId}`,
                status,
                total,
                date,
                shippingAddress,
              },
            },
          },
          {
            Put: {
              TableName: TABLE_NAME,
              Item: {
                ...Keys.orderRef(userId, date, orderId),
                orderId,
                status,
                total,
                shippingAddress,
                GSI1PK: gsi1UserStatusKey(userId, status),
                GSI1SK: dateZ,
              },
            },
          },
          ...items.map((item) => ({
            Put: {
              TableName: TABLE_NAME,
              Item: {
                ...Keys.orderItem(orderId, item.productSlug),
                productName: item.productName,
                qty: item.qty,
                unitPrice: item.unitPrice,
                subtotal: item.subtotal,
              },
            },
          })),
        ],
      }),
    );
  }

  async updateStatus(
    orderId: string,
    userId: string,
    date: string,
    newStatus: Order["status"],
  ): Promise<void> {
    await getDocClient().send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Update: {
              TableName: TABLE_NAME,
              Key: Keys.orderMetadata(orderId),
              UpdateExpression: "SET #s = :s",
              ExpressionAttributeNames: { "#s": "status" },
              ExpressionAttributeValues: { ":s": newStatus },
            },
          },
          {
            Update: {
              TableName: TABLE_NAME,
              Key: Keys.orderRef(userId, date, orderId),
              UpdateExpression: "SET #s = :s, GSI1PK = :gsi1pk",
              ExpressionAttributeNames: { "#s": "status" },
              ExpressionAttributeValues: {
                ":s": newStatus,
                ":gsi1pk": gsi1UserStatusKey(userId, newStatus),
              },
            },
          },
        ],
      }),
    );
  }
}
