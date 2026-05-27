import { z } from "zod";
import { api } from "./client";
import { CategorySchema, ProductListItemSchema } from "../types/models";

const CategoriesSchema = z.array(CategorySchema);
const ProductsSchema = z.array(ProductListItemSchema);

export function listCategories() {
  return api("/categories", CategoriesSchema);
}

export function listProducts() {
  return api("/products", ProductsSchema);
}

export function listProductsByCategory(slug: string) {
  return api(`/categories/${slug}/products`, ProductsSchema);
}

export function searchProducts(query: string) {
  const q = encodeURIComponent(query.trim());
  return api(`/products?q=${q}`, ProductsSchema);
}
