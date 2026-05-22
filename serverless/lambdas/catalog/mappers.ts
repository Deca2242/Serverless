import type { Category, Product, ProductListItem, Stock } from "../shared/models";

export function itemToCategory(item: Record<string, unknown>): Category {
  return {
    slug: (item.PK as string).replace("CATEGORY#", ""),
    name: item.name as string,
    icon: item.icon as string | undefined,
  };
}

export function itemToProduct(item: Record<string, unknown>): Product {
  return {
    slug: (item.PK as string).replace("PRODUCT#", ""),
    name: item.name as string,
    price: Number(item.price),
    description: item.description as string | undefined,
    imageUrl: item.imageUrl as string | undefined,
    categorySlug: item.categorySlug as string,
  };
}

export function itemToStock(item: Record<string, unknown>): Stock {
  return {
    productSlug: (item.PK as string).replace("PRODUCT#", ""),
    qty: Number(item.qty),
  };
}

export function toProductListItem(product: Product, qty: number): ProductListItem {
  return { ...product, stock: qty };
}

export interface ProductWithStock {
  name: string;
  price: number;
  stockQty: number;
  categorySlug: string;
}
