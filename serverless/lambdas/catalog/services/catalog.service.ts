import { createHash } from "crypto";

import {
  cached,
  CacheKeys,
  TTL,
  del,
  delByPrefix,
  invalidateCatalogCategories,
  invalidateCatalogProduct,
} from "../../shared/cache";
import { NotFoundError } from "../../shared/errors";
import type { Category, ProductListItem, Stock } from "../../shared/models";
import { parseBody } from "../../shared/validation";
import {
  CreateCategorySchema,
  CreateProductSchema,
  UpdateStockSchema,
} from "../schemas";
import { CatalogRepository } from "../repositories/catalog.repository";

export class CatalogService {
  constructor(private readonly repo: CatalogRepository) {}

  private searchHash(query: string): string {
    return createHash("sha256").update(query.toLowerCase().trim()).digest("hex").slice(0, 16);
  }

  async listCategories(): Promise<Category[]> {
    return cached(CacheKeys.catalogCategories(), TTL.catalogCategories, () =>
      this.repo.scanCategories(),
    );
  }

  async createCategory(body?: string): Promise<{ slug: string }> {
    const { slug, name, icon } = parseBody(CreateCategorySchema, body);
    await this.repo.saveCategory(slug, name, icon);
    await invalidateCatalogCategories();
    return { slug };
  }

  async listAllProducts(): Promise<ProductListItem[]> {
    return cached(CacheKeys.catalogAllProducts(), TTL.catalogCategoryProducts, async () => {
      const products = await this.repo.scanAllProducts();
      return this.repo.enrichWithStock(products);
    });
  }

  async listProductsByCategory(categorySlug: string): Promise<ProductListItem[]> {
    return cached(
      CacheKeys.catalogCategoryProducts(categorySlug),
      TTL.catalogCategoryProducts,
      async () => {
        const products = await this.repo.queryProductsByCategory(categorySlug);
        return this.repo.enrichWithStock(products);
      },
    );
  }

  async getProduct(slug: string): Promise<ProductListItem> {
    const product = await cached(CacheKeys.catalogProduct(slug), TTL.catalogProduct, async () => {
      const found = await this.repo.findProduct(slug);
      if (!found) throw new NotFoundError(`Product '${slug}'`);
      const [enriched] = await this.repo.enrichWithStock([found]);
      return enriched;
    });
    return product;
  }

  async search(query: string): Promise<ProductListItem[]> {
    const trimmed = query.trim();
    const hash = this.searchHash(trimmed);
    return cached(CacheKeys.catalogSearch(hash), TTL.catalogSearch, async () => {
      const products = await this.repo.scanProductsForSearch(trimmed);
      return this.repo.enrichWithStock(products);
    });
  }

  async getStock(slug: string): Promise<Stock> {
    const stock = await cached(CacheKeys.catalogStock(slug), TTL.catalogStock, async () => {
      const found = await this.repo.findStock(slug);
      if (!found) throw new NotFoundError(`Stock for product '${slug}'`);
      return found;
    });
    return stock;
  }

  async createProduct(body?: string): Promise<{ slug: string; stockQty: number }> {
    const input = parseBody(CreateProductSchema, body);
    const { slug, name, price, description, imageUrl, categorySlug, stockQty } = input;

    const category = await this.repo.findCategory(categorySlug);
    if (!category) throw new NotFoundError(`Category '${categorySlug}'`);

    await this.repo.saveProduct({ slug, name, price, categorySlug, description, imageUrl });
    await this.repo.saveStock(slug, stockQty ?? 0);

    await Promise.all([
      invalidateCatalogCategories(),
      del(CacheKeys.catalogAllProducts()),
      del(CacheKeys.catalogCategoryProducts(categorySlug)),
      delByPrefix("catalog:search:"),
    ]);

    return { slug, stockQty: stockQty ?? 0 };
  }

  async updateStock(slug: string, body?: string): Promise<{ productSlug: string; qty: number }> {
    const { qty } = parseBody(UpdateStockSchema, body);

    const product = await this.repo.findProduct(slug);
    if (!product) throw new NotFoundError(`Product '${slug}'`);

    await this.repo.updateStockQty(slug, qty);
    await invalidateCatalogProduct(slug, product.categorySlug);

    return { productSlug: slug, qty };
  }
}
