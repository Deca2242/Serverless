import {
  GetCommand,
  PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";

import { getDocClient, TABLE_NAME, Keys } from "../../shared/dynamodb";
import type { Address, Payment, User } from "../../shared/models";
import { itemToAddress, itemToPayment, itemToUser } from "../mappers";

export class UserRepository {
  // User | null — perfil del usuario (nombre y email)
  async findProfile(userId: string): Promise<User | null> {
    const res = await getDocClient().send(
      new GetCommand({ TableName: TABLE_NAME, Key: Keys.userProfile(userId) }),
    );
    return res.Item ? itemToUser(res.Item as Record<string, unknown>) : null;
  }

  // void — inserta perfil; falla si el userId ya existe
  async saveProfile(userId: string, name: string, email: string): Promise<void> {
    await getDocClient().send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: { ...Keys.userProfile(userId), name, email },
        ConditionExpression: "attribute_not_exists(PK)",
      }),
    );
  }

  // Address[] — direcciones de envío del usuario
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

  // Payment[] — métodos de pago del usuario
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
}
