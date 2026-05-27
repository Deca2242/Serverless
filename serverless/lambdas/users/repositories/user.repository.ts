import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";

import { getDocClient, TABLE_NAME, Keys, GSI1_NAME, gsi1UserStatusKey } from "../../shared/dynamodb";
import type { Address, Order, Payment, User } from "../../shared/models";
import {
  itemToAddress,
  itemToOrderRef,
  itemToPayment,
  itemToUser,
} from "../mappers";

export class UserRepository {
  async findProfile(userId: string): Promise<User | null> {
    const res = await getDocClient().send(
      new GetCommand({ TableName: TABLE_NAME, Key: Keys.userProfile(userId) }),
    );
    return res.Item ? itemToUser(res.Item as Record<string, unknown>) : null;
  }

  async saveProfile(userId: string, name: string, email: string): Promise<void> {
    await getDocClient().send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: { ...Keys.userProfile(userId), name, email },
        ConditionExpression: "attribute_not_exists(PK)",
      }),
    );
  }

  async findAddresses(userId: string): Promise<Address[]> {
    const res = await getDocClient().send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
        ExpressionAttributeValues: {
          ":pk": `USER#${userId}`,
          ":prefix": "ADDRESS#",
        },
      }),
    );
    return (res.Items ?? []).map((i) => itemToAddress(i as Record<string, unknown>));
  }

  async saveAddress(
    userId: string,
    addressId: string,
    street: string,
    city: string,
  ): Promise<void> {
    await getDocClient().send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: { ...Keys.address(userId, addressId), street, city },
      }),
    );
  }

  async deleteAddress(userId: string, addressId: string): Promise<void> {
    await getDocClient().send(
      new DeleteCommand({ TableName: TABLE_NAME, Key: Keys.address(userId, addressId) }),
    );
  }

  async findPayments(userId: string): Promise<Payment[]> {
    const res = await getDocClient().send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
        ExpressionAttributeValues: {
          ":pk": `USER#${userId}`,
          ":prefix": "PAYMENT#",
        },
      }),
    );
    return (res.Items ?? []).map((i) => itemToPayment(i as Record<string, unknown>));
  }

  async savePayment(
    userId: string,
    paymentId: string,
    type: string,
    last4?: string,
  ): Promise<void> {
    await getDocClient().send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          ...Keys.payment(userId, paymentId),
          type,
          ...(last4 ? { last4 } : {}),
        },
      }),
    );
  }

  async deletePayment(userId: string, paymentId: string): Promise<void> {
    await getDocClient().send(
      new DeleteCommand({ TableName: TABLE_NAME, Key: Keys.payment(userId, paymentId) }),
    );
  }

  async findOrders(userId: string): Promise<Order[]> {
    const res = await getDocClient().send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
        ExpressionAttributeValues: {
          ":pk": `USER#${userId}`,
          ":prefix": "ORDER#",
        },
        ScanIndexForward: false,
      }),
    );
    return (res.Items ?? []).map((i) => itemToOrderRef(i as Record<string, unknown>));
  }

  async findOrdersByStatus(userId: string, status: string): Promise<Order[]> {
    const res = await getDocClient().send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: GSI1_NAME,
        KeyConditionExpression: "GSI1PK = :gsi1pk",
        ExpressionAttributeValues: {
          ":gsi1pk": gsi1UserStatusKey(userId, status),
        },
        ScanIndexForward: false,
      }),
    );
    return (res.Items ?? []).map((i) => itemToOrderRef(i as Record<string, unknown>));
  }
}
