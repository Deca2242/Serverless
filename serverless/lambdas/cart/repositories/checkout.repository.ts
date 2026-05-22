import { TransactWriteCommand } from "@aws-sdk/lib-dynamodb";

import { getDocClient, TABLE_NAME, Keys } from "../../shared/dynamodb";
import type { CartItem } from "../../shared/models";

export interface CheckoutInput {
  orderId: string;
  userId: string;
  date: string;
  shippingAddress: string;
  items: CartItem[];
  total: number;
}

export class CheckoutRepository {
  async createOrderWithStockDecrement(input: CheckoutInput): Promise<void> {
    const { orderId, userId, date, shippingAddress, items, total } = input;
    const dateZ = date.substring(0, 19) + "Z";

    await getDocClient().send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Put: {
              TableName: TABLE_NAME,
              Item: {
                ...Keys.orderMetadata(orderId),
                userId: `USER#${userId}`,
                status: "pending",
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
                status: "pending",
                total,
                shippingAddress,
                GSI1PK: `USER#${userId}#STATUS#pending`,
                GSI1SK: dateZ,
              },
            },
          },
          ...items.flatMap((item) => [
            {
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
            },
            {
              Update: {
                TableName: TABLE_NAME,
                Key: Keys.stock(item.productSlug),
                UpdateExpression: "SET qty = qty - :qty",
                ConditionExpression: "qty >= :qty",
                ExpressionAttributeValues: { ":qty": item.qty },
              },
            },
          ]),
        ],
      }),
    );
  }
}
