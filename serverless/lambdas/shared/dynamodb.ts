import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

let _client: DynamoDBDocumentClient | undefined;

export function getDocClient(): DynamoDBDocumentClient {
  if (_client) return _client;

  const endpoint = process.env.DYNAMO_ENDPOINT;
  const region = process.env.AWS_DEFAULT_REGION ?? "us-east-1";

  const raw = new DynamoDBClient({
    region,
    ...(endpoint ? { endpoint } : {}),
  });

  _client = DynamoDBDocumentClient.from(raw, {
    marshallOptions: { removeUndefinedValues: true },
  });

  return _client;
}

export const TABLE_NAME = process.env.TABLE_NAME ?? "MercadoGlobal";

export const GSI1_NAME = "GSI1-UserStatus-Date";


export function normalizeOrderDate(date: string): string {
  return date.substring(0, 19) + "Z";
}

export function gsi1UserStatusKey(userId: string, status: string): string {
  return `USER#${userId}#STATUS#${status}`;
}

export function gsi1CategoryKey(slug: string): string {
  return `CATEGORY#${slug}`;
}

// ─── Key helpers ────────────────────────────────────────────────────────────

export const Keys = {
  userProfile: (userId: string) => ({
    PK: `USER#${userId}`,
    SK: "#PROFILE",
  }),
  address: (userId: string, addressId: string) => ({
    PK: `USER#${userId}`,
    SK: `ADDRESS#${addressId}`,
  }),
  payment: (userId: string, paymentId: string) => ({
    PK: `USER#${userId}`,
    SK: `PAYMENT#${paymentId}`,
  }),
  orderRef: (userId: string, date: string, orderId: string) => {
    const dateZ = normalizeOrderDate(date);
    return {
      PK: `USER#${userId}`,
      SK: `ORDER#${dateZ}#${orderId}`,
    };
  },
  orderMetadata: (orderId: string) => ({
    PK: `ORDER#${orderId}`,
    SK: "#METADATA",
  }),
  orderItem: (orderId: string, productSlug: string) => ({
    PK: `ORDER#${orderId}`,
    SK: `ITEM#${productSlug}`,
  }),
  category: (slug: string) => ({
    PK: `CATEGORY#${slug}`,
    SK: "#METADATA",
  }),
  product: (slug: string) => ({
    PK: `PRODUCT#${slug}`,
    SK: "#METADATA",
  }),
  stock: (slug: string) => ({
    PK: `PRODUCT#${slug}`,
    SK: "#STOCK",
  }),
};

// ─── Path param extractor ────────────────────────────────────────────────
// Floci's HTTP API v2 events do not populate `pathParameters`, so derive them
// from `routeKey` (e.g. "GET /users/{userId}/profile") and `rawPath`.
export function extractPathParams(
  routeKey: string | undefined,
  rawPath: string | undefined,
  provided?: Record<string, string | undefined> | null,
): Record<string, string> {
  if (provided && Object.keys(provided).length > 0) {
    return Object.fromEntries(
      Object.entries(provided).filter(([, v]) => v !== undefined),
    ) as Record<string, string>;
  }
  if (!routeKey || !rawPath) return {};
  const routePath = routeKey.split(" ").slice(1).join(" ");
  const routeSegments = routePath.split("/").filter(Boolean);
  const pathSegments = rawPath.split("/").filter(Boolean);
  if (routeSegments.length !== pathSegments.length) return {};
  const out: Record<string, string> = {};
  for (let i = 0; i < routeSegments.length; i++) {
    const r = routeSegments[i];
    if (r.startsWith("{") && r.endsWith("}")) {
      out[r.slice(1, -1)] = decodeURIComponent(pathSegments[i]);
    }
  }
  return out;
}
