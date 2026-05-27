import {
  BatchGetCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";

import { getDocClient, TABLE_NAME, Keys, GSI1_NAME, gsi1CategoryKey } from "../../shared/dynamodb";
import type { Category, Product, ProductListItem, Stock } from "../../shared/models";
import {
  itemToCategory,
  itemToProduct,
  itemToStock,
  toProductListItem,
  type ProductWithStock,
} from "../mappers";

export class CatalogRepository {
  async scanCategories(): Promise<Category[]> {
    const res = await getDocClient().send(
      new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: "begins_with(PK, :pk) AND SK = :sk",
        ExpressionAttributeValues: {
          ":pk": "CATEGORY#",
          ":sk": "#METADATA",
        },
      }),
    );
    return (res.Items ?? [])
      .map((i) => itemToCategory(i as Record<string, unknown>))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async saveCategory(slug: string, name: string, icon?: string): Promise<void> {
    await getDocClient().send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          ...Keys.category(slug),
          name,
          ...(icon ? { icon } : {}),
        },
        ConditionExpression: "attribute_not_exists(PK)",
      }),
    );
  }

  async findCategory(slug: string): Promise<Category | null> {
    const res = await getDocClient().send(
      new GetCommand({ TableName: TABLE_NAME, Key: Keys.category(slug) }),
    );
    return res.Item ? itemToCategory(res.Item as Record<string, unknown>) : null;
  }

  async scanAllProducts(): Promise<Product[]> {
    const res = await getDocClient().send(
      new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: "begins_with(PK, :pk) AND SK = :sk",
        ExpressionAttributeValues: {
          ":pk": "PRODUCT#",
          ":sk": "#METADATA",
        },
      }),
    );
    return (res.Items ?? [])
      .map((i) => itemToProduct(i as Record<string, unknown>))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async queryProductsByCategory(categorySlug: string): Promise<Product[]> {
    const res = await getDocClient().send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: GSI1_NAME,
        KeyConditionExpression: "GSI1PK = :gsi1pk",
        ExpressionAttributeValues: {
          ":gsi1pk": gsi1CategoryKey(categorySlug),
        },
      }),
    );
    return (res.Items ?? []).map((i) => itemToProduct(i as Record<string, unknown>));
  }

  async findProduct(slug: string): Promise<Product | null> {
    const res = await getDocClient().send(
      new GetCommand({ TableName: TABLE_NAME, Key: Keys.product(slug) }),
    );
    return res.Item ? itemToProduct(res.Item as Record<string, unknown>) : null;
  }

  async findStock(slug: string): Promise<Stock | null> {
    const res = await getDocClient().send(
      new GetCommand({ TableName: TABLE_NAME, Key: Keys.stock(slug) }),
    );
    return res.Item ? itemToStock(res.Item as Record<string, unknown>) : null;
  }

  async batchGetStockQty(slugs: string[]): Promise<Map<string, number>> {
    const qtyBySlug = new Map<string, number>();
    if (slugs.length === 0) return qtyBySlug;

    const chunkSize = 100;
    for (let i = 0; i < slugs.length; i += chunkSize) {
      const chunk = slugs.slice(i, i + chunkSize);
      const res = await getDocClient().send(
        new BatchGetCommand({
          RequestItems: {
            [TABLE_NAME]: {
              Keys: chunk.map((slug) => Keys.stock(slug)),
            },
          },
        }),
      );
      for (const item of res.Responses?.[TABLE_NAME] ?? []) {
        const stock = itemToStock(item as Record<string, unknown>);
        qtyBySlug.set(stock.productSlug, stock.qty);
      }
    }

    return qtyBySlug;
  }

  async enrichWithStock(products: Product[]): Promise<ProductListItem[]> {
    const stockMap = await this.batchGetStockQty(products.map((p) => p.slug));
    return products.map((product) =>
      toProductListItem(product, stockMap.get(product.slug) ?? 0),
    );
  }

  async findProductWithStock(slug: string): Promise<ProductWithStock | null> {
    const [product, stock] = await Promise.all([this.findProduct(slug), this.findStock(slug)]);
    if (!product || !stock) return null;
    return {
      name: product.name,
      price: product.price,
      stockQty: stock.qty,
      categorySlug: product.categorySlug,
    };
  }

  async scanProductsForSearch(query: string): Promise<Product[]> {
    const res = await getDocClient().send(
      new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: "begins_with(PK, :pk) AND SK = :sk",
        ExpressionAttributeValues: {
          ":pk": "PRODUCT#",
          ":sk": "#METADATA",
        },
      }),
    );
    const q = query.toLowerCase();
    return (res.Items ?? [])
      .map((i) => itemToProduct(i as Record<string, unknown>))
      .filter(
        (p) => p.name.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q),
      );
  }

  async saveProduct(input: {
    slug: string;
    name: string;
    price: number;
    categorySlug: string;
    description?: string;
    imageUrl?: string;
  }): Promise<void> {
    const { slug, name, price, categorySlug, description, imageUrl } = input;
    await getDocClient().send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          ...Keys.product(slug),
          name,
          price,
          categorySlug,
          GSI1PK: gsi1CategoryKey(categorySlug),
          GSI1SK: `PRODUCT#${name}`,
          ...(description ? { description } : {}),
          ...(imageUrl ? { imageUrl } : {}),
        },
        ConditionExpression: "attribute_not_exists(PK)",
      }),
    );
  }

  async saveStock(slug: string, qty: number): Promise<void> {
    await getDocClient().send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: { ...Keys.stock(slug), qty },
      }),
    );
  }

  async updateStockQty(slug: string, qty: number): Promise<void> {
    await getDocClient().send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: Keys.stock(slug),
        UpdateExpression: "SET qty = :qty",
        ExpressionAttributeValues: { ":qty": qty },
      }),
    );
  }
}
